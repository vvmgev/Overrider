import RuleService from "@/services/BrowserRuleService";
import StorageService from "@services/StorageService";
import BSService from "@services/BrowserSupportService";
import InjectCodeService from "@services/InjectCodeService";
import BaseService from "@services/BaseService";
import MatcherService from "@services/MatcherService";
import config from "@options/formBuilder/config";
import handleError from "./errorHandler";
import { ListenerType } from "@services/ListenerService/ListenerService";
import { PostMessageAction } from "@models/postMessageActionModel";
import { IRuleMetaData, PageType } from "@models/formFieldModel";
import { StorageKey } from "@models/storageModel";
import { UNINSTALL_URL, EXCLUDED_URLS } from "@options/constant";
import { throttle } from "@utils/throttle";
import { storeTracking } from "./firebase";
import "@services/RegisterService";

import MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL = chrome.declarativeNetRequest.MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL;
import GETMATCHEDRULES_QUOTA_INTERVAL = chrome.declarativeNetRequest.GETMATCHEDRULES_QUOTA_INTERVAL;
import UpdateRuleOptions = chrome.declarativeNetRequest.UpdateRuleOptions;
import Rule = chrome.declarativeNetRequest.Rule;

class ServiceWorker extends BaseService {
  private listenersMap: Partial<Record<PostMessageAction, any>>;
  throttleUpdateMatchedRulesTimestamp: () => void;
  constructor() {
    super();
    this.registerListener();
    const delay = (GETMATCHEDRULES_QUOTA_INTERVAL * 60 * 1000) / MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL;
    this.throttleUpdateMatchedRulesTimestamp = throttle(this.updateMatchedRulesTimestamp, delay);
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
    this.listenersMap = {
      [PostMessageAction.GetUserId]: this.getUserId,
      [PostMessageAction.GetExtensionStatus]: this.getExtensionStatus,
    };
  }

  async registerListener(): Promise<void> {
    this.addListener(ListenerType.ON_INSTALL, this.onInstalled)
      .addListener(ListenerType.ON_MESSAGE, this.onMessage)
      .addListener(ListenerType.ON_MESSAGE_EXTERNAL, this.onMessage)
      .addListener(ListenerType.ON_UPDATE_TAB, this.onUpdatedTab);
  }

  onMessage = async (request, sender, sendResponse) => {
    const handler = this.listenersMap[request.action];
    if (handler) {
      try {
        sendResponse(await handler(request.data));
      } catch (error: any) {
        const { version } = chrome.runtime.getManifest();
        sendResponse({
          error: true,
          info: handleError(error, {
            action: PostMessageAction[request.action],
            data: { ...(request.data || {}), version },
          }),
        });
      }
    }
  };

  onInstalled = async () => {
    // temp function
    StorageService.remove(StorageKey.CONFIG);
    // Temp function
    // Add 'resourceTypes' to local storage rules
    const ruleMetaData = await StorageService.getRules();
    ruleMetaData.forEach(async (item: IRuleMetaData) => {
      if (!item.resourceTypes) {
        item.resourceTypes = [];
        await StorageService.set({ [item.id as number]: item });
      }
      const { version } = chrome.runtime.getManifest();
      if (version === "1.0.35") {
        item.lastMatchedTimestamp = item.timestamp as number;
        delete item.timestamp;
        await StorageService.set({ [item.id as number]: item });
      }
    });
  };

  onUpdatedTab = (tabId, changeInfo, tab): void => {
    this.injectContentScript(tabId, changeInfo, tab);
    this.getMatchedRules(tab);
  };

  getMatchedRules = async (tab) => {
    if (tab.status === "complete") {
      const enabledRules: IRuleMetaData[] = await StorageService.getFilteredRules([{ key: "enabled", value: true }]);
      const isUrlsMatch = enabledRules.some((rule) => MatcherService.isUrlsMatch(rule.source, tab.url, rule.matchType));
      const hasRedirectRule = enabledRules.some(
        (rule: IRuleMetaData) =>
          // On redirect url doesn't match
          (rule.pageType === PageType.REDIRECT && rule.destination) ||
          // MODIFY_RESPONSE uses REDIRECT rule
          rule.pageType === PageType.MODIFY_RESPONSE
      );
      if (enabledRules.length && (isUrlsMatch || hasRedirectRule)) {
        this.throttleUpdateMatchedRulesTimestamp();
      }
    }
  };

  updateMatchedRulesTimestamp = async (): Promise<void> => {
    try {
      const matchedRules = await RuleService.getMatchedRules();
      matchedRules.rulesMatchedInfo.forEach(({ rule, timeStamp }) => {
        StorageService.updateRuleTimestamp(String(rule.ruleId), timeStamp);
      });
    } catch (error) {}
  };

  injectContentScript = async (tabId, _, tab) => {
    const isUrlExluded: boolean = EXCLUDED_URLS.some((url) => tab.url?.startsWith(url));
    const filters = [
      { key: "pageType", value: PageType.MODIFY_REQUEST_BODY },
      { key: "enabled", value: true },
    ];
    const rules: IRuleMetaData[] = await StorageService.getFilteredRules(filters);
    if (!BSService.isSupportScripting() || isUrlExluded || !rules.length) return;
    InjectCodeService.injectContentScript(tabId, rules);
  };

  async getUserId(): Promise<{ [key: string]: number }> {
    return { [StorageKey.USER_ID]: await StorageService.getUserId() };
  }

  async changeRuleStatusById({ id, checked }: { id: number; checked: boolean }): Promise<void> {
    const ruleMetaData: IRuleMetaData = await StorageService.getSingleItem(String(id));
    const ruleServiceRule = await RuleService.getRuleById(id);
    const updateRuleOptions: UpdateRuleOptions = { removeRuleIds: [id] };
    try {
      if (checked && ruleMetaData.pageType !== PageType.MODIFY_REQUEST_BODY) {
        const rule: Rule = config[ruleMetaData.pageType].generateRule(ruleMetaData);
        updateRuleOptions.addRules = [{ ...rule, id }];
      }
      // TODO: FIXME:  need investigation
      // when checked = false
      // it doesn't remove the rule
      await RuleService.updateDynamicRules(updateRuleOptions);
      await StorageService.set({ [id]: { ...ruleMetaData, enabled: checked } });
      if (!checked) {
        const ruleServiceRuleRemoved = await RuleService.getRuleById(id);
        storeTracking({
          action: "ChangeRuleStatusById",
          data: {
            checked,
            ruleMetaData,
            ruleServiceRule: ruleServiceRule || "undefined",
            ruleServiceRuleRemoved: ruleServiceRuleRemoved || "undefined",
          },
        });
      }
    } catch (error) {
      handleError(error, {
        action: "ChangeRuleStatusById",
        data: { checked, ruleServiceRule, ruleMetaData },
      });
      return Promise.reject(error);
    }
  }

  async getExtensionStatus(): Promise<boolean> {
    const status: boolean = await StorageService.getSingleItem(StorageKey.EXTENSION_STATUS);
    return typeof status === "undefined" ? !status : status;
  }
}

new ServiceWorker();
