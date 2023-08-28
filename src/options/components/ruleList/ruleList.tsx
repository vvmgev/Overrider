import React, { useEffect, useState, useRef } from 'react';
import Popup from 'reactjs-popup';
import { Link } from 'react-router-dom';
import { PostMessageAction } from 'models/postMessageActionModel';
import { IRuleMetaData, IconsMap } from 'models/formFieldModel';
import { getTimeDifference } from 'options/utils';
import { PageName } from 'models/formFieldModel';
import { downloadFile } from 'options/utils/downloadFile';
import { validateJSON } from 'src/options/utils/validateJSON';
import { readFile } from 'src/options/utils/readFile';
import Input from 'components/common/input/input';
import TrackService from 'src/services/TrackService';
import OutlineButton from 'components/common/outlineButton/outlineButton';
import ColorCover from 'components/common/colorCover/colorCover';
import Switcher from 'components/common/switcher/switcher';
import Tooltip from 'components/common/tooltip/tooltip';
import CrossSVG  from 'assets/icons/cross.svg';
import PencilSVG  from 'assets/icons/pencil.svg';
import SearchSVG  from 'assets/icons/search.svg';
import ArrowDownLongSVG  from 'assets/icons/arrowDownLong.svg';
import ArrowUpLongSVG  from 'assets/icons/arrowUpLong.svg';
import TrashSVG  from 'assets/icons/trash.svg';
import DocumentCopySVG  from 'assets/icons/documentCopy.svg';
import ListSVG  from 'assets/icons/list.svg';
import 'reactjs-popup/dist/index.css';

export default () => {
  const COUNT_SYMBOLS = 22;
  const importRulesRef = useRef<any>();
  const [data, setData] = useState<IRuleMetaData[]>([] as IRuleMetaData[]);
  const [search, setSearch] = useState<string>('');
  const [importFailed, setImportFailed] = useState<boolean>(false);
  const onHandleClearSearch = () => setSearch('');
  const onChangeSearch = event => setSearch(event.target.value);
  const onHandleImport = () => importRulesRef.current.click();
  const onHandleDeleteRules = (): void => chrome.runtime.sendMessage({action: PostMessageAction.DeleteRules }, () => getData());
  const onHandleExportRules = (): void => chrome.runtime.sendMessage({action: PostMessageAction.ExportRules }, rules => downloadFile(rules));
  const duplicateRule = (id: number): void => chrome.runtime.sendMessage({ action: PostMessageAction.CopyRuleById, data: {id} }, () => getData());
  const onChangeRuleStatus = (event, id): void => chrome.runtime.sendMessage({action: PostMessageAction.ChangeRuleStatusById, data: {id, checked: event.target.checked}}, () => getData())
  const getData = (): void => chrome.runtime.sendMessage({action: PostMessageAction.GetStorageRules}, setData);
  const cutString = (string: string): string => string.length > COUNT_SYMBOLS ? string.slice(0, COUNT_SYMBOLS) + '...' : string;
  useEffect(() => getData(), []);
  const handleDelete = (ruleMetaData) => {
      TrackService.trackEvent(`${PageName[ruleMetaData.pageType]} Rule Delete Event`);
      chrome.runtime.sendMessage({
          action: PostMessageAction.DeleteRule, data: {id: ruleMetaData.id} }, 
          () => getData()
      );
  };

  const onHandleUploadFile = (event) => {
    readFile(event.target.files[0], (fileContent) => {
      if(validateJSON(fileContent)) {
        const data = JSON.parse(fileContent);
        chrome.runtime.sendMessage({action: PostMessageAction.ImportRules, data }, () => getData());
      } else {
        setImportFailed(true);
      }
    });
  }

  const generateLastMatchedTime = (timestamp: number): string => {
    if(typeof timestamp !== 'number') return 'Not used';
    const { hours, minutes, seconds } = getTimeDifference(timestamp);
    return `${hours > 0 ? `${hours}h` : '' } ${minutes > 0 ? `${minutes}m` : '' } ${hours > 0 ? '' : `${seconds}s`} ago`;
  }

  return <div className="min-h-[250px] overflow-hidden mx-[5%]">
    <Popup closeOnDocumentClick={true} contentStyle={{background: 'transparent', border: 'none'}}
      open={importFailed} onClose={() => setImportFailed(false)}
      modal position="right center">
        {/* @ts-ignore */}
        {(close: any) => (
          <ColorCover classes="bg-opacity-90 py-15">
            <div className="flex border-b border-slate-700 pb-5">
              <div className="text-slate-200 text-2xl flex-1">Import Failed</div>
              <div className="flex justify-end flex-1">
                <span onClick={close} className="w-[30px] cursor-pointer text-slate-200 hover:text-sky-500"><CrossSVG /></span>
              </div>
            </div>
            <div className="text-slate-200 text-2xl text-center mt-10">You have Invalid JSON file</div>
            <div className="text-slate-500 text-base text-center">Please make sure you are uploading valid JSON file</div>
            <div className="text-slate-500 text-base text-center mb-10">You can validate by this service &nbsp;
              <a className='text-sky-500 cursor-pointer underline' href="https://codebeautify.org/jsonvalidator" target='_black'>Codebeautify.org</a>
            </div>
            <div className="flex flex-row text-slate-200 text-2xl items-center justify-center gap-10">
              <OutlineButton trackName='invalid JSON Close' classes="min-w-[100px]" onClick={close}>Close</OutlineButton>
            </div>
          </ColorCover>
        )}
      </Popup>
      <div className="w-full rounded-tr-3xl rounded-bl-xl rounded-br-xl text-slate-200 rounded-tl-3xl bg-slate-800 bg-opacity-40 border border-slate-700">
        {!Boolean(data.length) && <div className="w-full h-full p-5">
          <div className='flex justify-between'>
            <p className="text-2xl">👋 Welcome to Inssman!</p>
            <div className='text-base'>
              <input type="file" onChange={onHandleUploadFile} ref={importRulesRef} className="hidden" accept='application/JSON'/>
              <OutlineButton onClick={onHandleImport} trackName='Import rules' icon={<ArrowDownLongSVG />}>Import Rules</OutlineButton>
            </div>
          </div>
          
          <p className="mt-5 text-lg">Creating a rule gives you control over HTTP requests and responses.</p>
          <p>With Inssman you can easly do following</p>
          <ul className="ml-3 mt-3 list-disc">
            <li className="mt-1">Redirect any type of request</li>
            <li className="mt-1">Block requests</li>
            <li className="mt-1">Add/remove/replace query parameters</li>
            <li className="mt-1">Add/remove/replace/append request headers</li>
            <li className="mt-1">Add/remove/replace/append response headers</li>
            <li className="mt-1">Return custom HTML/CSS/JS/JSON file as a response</li>
            <li className="mt-1">HTTP Logger for request/response headers</li>
            <li className="mt-1">Modify request body</li>
            <li className="mt-1">Inject custom HTML/CSS/JavaScript file</li>
            <li className="mt-1">Delay request (comming soon)</li>
          </ul>
        </div>}
        {Boolean(data.length) && (
          <div>
            <div className="text-lg py-5 max-h-[90%] w-full flex justify-between items-center px-6">
              <span className="flex flex-row items-center gap-2">
                <span className="w-[24px]">{<ListSVG />}</span>
                <span>All Rules</span>
              </span>
              <div className="flex items-center gap-5">
                <div>
                  <input type="file" onChange={onHandleUploadFile} ref={importRulesRef} className="hidden" accept='application/JSON'/>
                  <OutlineButton onClick={onHandleImport} trackName='Import rules' icon={<ArrowDownLongSVG />}>Import</OutlineButton>
                </div>
                <div><OutlineButton onClick={onHandleExportRules} trackName='Export rules' icon={<ArrowUpLongSVG />}>Export</OutlineButton></div>
                <Popup closeOnDocumentClick={true} contentStyle={{background: 'transparent', border: 'none'}}
                      trigger={<div><OutlineButton classes='hover:text-red-400 hover:border-red-400' trackName='Delete All Rules Popup' icon={<TrashSVG />}>Delete All Rules</OutlineButton></div>}
                      modal position="right center">
                  {/* @ts-ignore */}
                  {(close: any) => (
                    <ColorCover classes="bg-opacity-90 py-15">
                      <div className="flex border-b border-slate-700 pb-5">
                        <div className="text-slate-200 text-2xl flex-1">Confirm Deletion</div>
                        <div className="flex justify-end flex-1">
                          <span onClick={close} className="w-[30px] cursor-pointer text-slate-200 hover:text-sky-500"><CrossSVG /></span>
                        </div>
                      </div>
                      <div className="text-slate-200 text-2xl text-center my-10">Are you sure you want to delete all rules?</div>
                      <div className="flex flex-row text-slate-200 text-2xl items-center justify-center gap-10">
                        <OutlineButton trackName='Delete All Rules - NO' classes="min-w-[100px]" onClick={close}>No</OutlineButton>
                        <OutlineButton icon={<TrashSVG />} classes="min-w-[100px] hover:text-red-400 hover:border-red-400" trackName="trackName='Delete All Rules - YES'" onClick={onHandleDeleteRules}>Yes</OutlineButton>
                      </div>
                  </ColorCover>
                  )}
                </Popup>
                <div className="text-sm">
                  <Input
                    placeholder="Search By Rule Name"
                    onChange={onChangeSearch}
                    value={search}
                    starts={<span className="w-[24px]"><SearchSVG /></span>}
                    ends={<span onClick={onHandleClearSearch} className="w-[24px] hover:text-red-400 cursor-pointer"><CrossSVG /></span>}
                  />
                </div>
              </div>
            </div>
            <div className="py-3 flex justify-between items-center px-6 w-full border-b border-slate-700 bg-slate-700 bg-opacity-40">
              <div className="flex-1">Name</div>
              <div className="flex-1">Type</div>
              <div className="flex-1">Source</div>
              <div className="flex-1">Last Matched <sup className="text-xs inline-block bottom-4 text-red-500">Beta</sup></div>
              <div className="flex-1">Status</div>
              <div className="flex-1 flex justify-end">Actions</div>
            </div>
          </div>          
        )}
        {Boolean(data.length) && (
          <ul className="overflow-y-auto min-h-[350px] max-h-[450px]">
            {data.filter((ruleMetaData) => ruleMetaData.name.includes(search))
            .reverse().map((ruleMetaData) => <li key={ruleMetaData.id} className="py-5 max-h-[90%] flex justify-between items-center px-6 border-b border-slate-700 w-full hover:bg-slate-800 hover:bg-opacity-40">
              <div className="flex-1 flex" >{cutString(ruleMetaData.name)}</div>
              <div className="flex items-center gap-1 flex-1">
                  <span className="w-[18px]">{IconsMap[ruleMetaData.pageType]}</span>
                  <div>{PageName[ruleMetaData.pageType]}</div>
              </div>
              <div className="flex-1 flex">{cutString(ruleMetaData.source)}</div>
              <div className="flex-1 flex">
                <div>{generateLastMatchedTime(ruleMetaData.lastMatchedTimestamp as number)}</div>
              </div>
              <div className="flex-1 flex">
                <Switcher checked={ruleMetaData.enabled} onChange={(event) => onChangeRuleStatus(event, ruleMetaData.id)}/>
              </div>
              <div className="flex-1 flex gap-5 justify-end">
                <Tooltip
                  actions={['hover']}
                  triggerElement={<div className="cursor-pointer hover:text-sky-500" onClick={() => duplicateRule(ruleMetaData.id)}><span className="w-[24px] inline-block"><DocumentCopySVG /></span></div>} >
                    <span className='text-slate-200'>Duplicate Rule</span>
                </Tooltip>
                <Tooltip
                  actions={['hover']}
                  triggerElement={<Link className="cursor-pointer hover:text-sky-500" to={`/edit/${ruleMetaData.pageType}/${ruleMetaData.id}`}><span className="w-[24px] inline-block"><PencilSVG /></span></Link>} >
                    <span className='text-slate-200'>Edit Rule</span>
                </Tooltip>
                <Tooltip
                  actions={['hover']}
                  triggerElement={<div className="cursor-pointer hover:text-red-400" onClick={() => handleDelete(ruleMetaData)}><span className="w-[24px] inline-block"><TrashSVG /></span></div>} >
                    <span className='text-slate-200'>Delete Rule</span>
                </Tooltip>
              </div>
            </li>)}
          </ul>
        )}
      </div>
  </div>
}