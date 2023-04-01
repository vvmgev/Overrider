import React from 'react';
import GithubSVG from 'assets/icons/github.svg'
import DocumentSVG from 'assets/icons/document.svg'
import ColorCover from '../common/colorCover/colorCover';


const Header =  () => {
    return <div className="flex justify-end">
        <ColorCover classes="flex gap-5 p-5 py-7 h-30 w-[initial] rounded-tl-none rounded-tr-none rounded-br-none">
            <a target="_blank" href="https://github.com/vvmgev/Inssman" className="flex gap-3 items-center hover:text-sky-500"><span className="w-[24px]">{<GithubSVG />}</span>Github</a>
            <a target="_blank" href="https://github.com/vvmgev/Inssman#documentation" className="flex gap-3 items-center hover:text-sky-500"><span className="w-[24px]">{<DocumentSVG />}</span>Docs</a>
        </ColorCover>
    </div>
}
export default Header;