import BaseService from "../BaseService";
import InjectCodeService from "../InjectCodeService";
import TabService from "../TabService";
import StorageService from "../StorageService";
import { InjectFileTagName } from "models/formFieldModel";
import { ListenerType } from "../ListenerService/ListenerService";
// import code from './contentCode';


function createRecorderWidget() {
  const newElement = document.createElement('button');
  newElement.textContent = 'Button';
  newElement.style.cssText = `
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
  `;
  newElement.addEventListener('click', () => {
    alert('Button clicked!');
    window.postMessage({type: "stopRecording"}, window.origin);
  });
  document.body.appendChild(newElement);
}

import Tab = chrome.tabs.Tab;

class RecordingService extends BaseService {
  private currentTab: Tab | null = null;
  private recordedEvents: Array<any> = [];
  private isRecording: boolean = false;

  onUpdateTab = (tabId: number, _: any, tab: Tab): void => {
    console.log('tabId', tabId);
    console.log('this.currentTab?.i', this.currentTab?.id);
    console.log('tab.status', tab.status);
    if(tabId === this.currentTab?.id && tab.status === 'complete') {
      InjectCodeService.injectInternalScript(tabId, `(${createRecorderWidget.toString()})();`, 'script');
      // InjectCodeService.injectInternalScript(this.currentTab.id, ``, InjectFileTagName.JAVASCRIPT, undefined, 'ISOLATED');

    }
  }

  async startRecording(url: string): Promise<void> {
    this.addListener(ListenerType.ON_UPDATE_TAB, this.onUpdateTab);
    this.currentTab = await TabService.createTab(url);
    chrome.tabs.onRemoved.addListener((tabId, info) => {
        if(tabId === this.currentTab?.id) {
          console.log('info', info);
        }
    });
  }

  async stopRecording(): Promise<void> {
    this.currentTab = null;
    this.recordedEvents = [];
    this.removeListener(ListenerType.ON_UPDATE_TAB, this.onUpdateTab);
    this.isRecording = false;
  }

  async saveRecording(data): Promise<void> {
    this.recordedEvents = [...this.recordedEvents, ...data];
    await StorageService.set({recordedSession:  this.recordedEvents});
  }
}

export default new RecordingService();
