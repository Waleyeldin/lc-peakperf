import { Link } from 'react-router-dom';
import imgAlef from '../assets/figma/header/imgAlef.svg';
import imgBackground from '../assets/figma/header/imgBackground.jpg';
import imgLine207 from '../assets/figma/header/imgLine207.svg';
import imgMagnifyingGlassSharpRegular2 from '../assets/figma/header/imgMagnifyingGlassSharpRegular2.svg';
import imgIstockphoto1369746033612X6122 from '../assets/figma/header/imgIstockphoto1369746033612X6122.jpg';
import imgIstockphoto1369746033612X6121 from '../assets/figma/header/imgIstockphoto1369746033612X6121.svg';
import imgChevronUpRegular22 from '../assets/figma/header/imgChevronUpRegular22.svg';
import imgLayer1 from '../assets/figma/header/imgLayer1.svg';
import imgBrightnessSharpRegular from '../assets/figma/header/imgBrightnessSharpRegular.svg';
import imgMoonSharpLight from '../assets/figma/header/imgMoonSharpLight.svg';
import imgScanYourReceipts from '../assets/figma/header/imgScanYourReceipts.svg';
import imgChevronRight from '../assets/figma/header/imgChevronRight.svg';
import imgChevronRight1 from '../assets/figma/header/imgChevronRight1.svg';
import imgVector from '../assets/figma/header/imgVector.svg';
import imgHouseSharpRegular1 from '../assets/figma/header/imgHouseSharpRegular1.svg';
import imgPin from '../assets/figma/header/imgPin.svg';

export default function Header() {
  return (
    <div className="content-stretch flex flex-col isolate items-start relative size-full" data-name="Top - Cutomer">
      <div className="bg-[#0062ff] h-[116px] mb-[-1px] overflow-clip relative shrink-0 w-full z-[3]" data-name="Header - Customer">
        <div className="absolute inset-[-89.66%_34.1%_-602.59%_28.82%]" data-name="Alef">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAlef} />
        </div>
        <div className="absolute flex h-[2503px] items-center justify-center left-[-2px] mix-blend-multiply top-[-965px] w-[1713px]">
          <div className="-scale-y-100 flex-none rotate-180">
            <div className="h-[2503px] relative w-[1713px]" data-name="Background">
              <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgBackground} />
            </div>
          </div>
        </div>
        <div className="absolute h-0 left-0 top-[100px] w-full">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLine207} />
        </div>
        <div className="absolute contents left-[32px] top-[32px]" data-name="Top header">
          <div className="absolute contents top-[36px]" data-name="Search Bar">
            <div className="absolute bg-[#172897] content-stretch flex h-[44px] items-center justify-center left-1/2 -translate-x-1/2 px-[18px] py-[12px] rounded-[200px] top-[36px] w-[71px]">
              <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center justify-center min-w-px relative">
                <div className="content-stretch flex flex-[1_0_0] gap-[19px] items-center justify-center min-w-px relative">
                  <div className="relative shrink-0 size-[16px]" data-name="magnifying-glass-sharp-regular 2">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMagnifyingGlassSharpRegular2} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute h-[41px] right-[32px] top-[38px] w-[179px]" data-name="Profile">
            <div className="absolute contents left-[111px] top-0" data-name="Mask group">
              <div className="absolute h-[92.25px] left-[43.91px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[67.094px_4.66px] mask-size-[41px_41px] top-[-4.66px] w-[138.375px]" style={{ maskImage: `url("${imgIstockphoto1369746033612X6121}")` }} data-name="istockphoto-1369746033-612x612 1">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgIstockphoto1369746033612X6122} />
              </div>
            </div>
            <div className="absolute flex items-center justify-center left-[163px] size-[16px] top-[10px]">
              <div className="-scale-y-100 flex-none">
                <div className="relative size-[16px]" data-name="chevron-up-regular-2 2">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronUpRegular22} />
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] absolute font-medium leading-[normal] left-0 not-italic text-[17px] text-white top-px tracking-[-0.34px] whitespace-nowrap">
              Rajesh Shah
            </p>
            <p className="[word-break:break-word] absolute font-normal leading-[normal] left-[37px] not-italic text-[17px] text-white top-[24px] tracking-[-0.34px] whitespace-nowrap">
              ADNOC
            </p>
          </div>
          <div className="absolute content-stretch flex gap-[16px] items-center left-[32px] top-[36px]" data-name="Logo">
            <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
              <div className="col-1 content-stretch flex h-[45.724px] items-center ml-0 mt-0 relative row-1 w-[78px]" data-name="Left">
                <div className="h-[45.724px] overflow-clip relative shrink-0 w-[78px]" data-name="Logo">
                  <div className="absolute inset-[0.53%_0.31%_8.47%_0.31%]" data-name="layer1">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayer1} />
                  </div>
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[24px] text-white whitespace-nowrap">
              Corporate Banking
            </p>
          </div>
          <div className="absolute content-stretch flex flex-col items-start right-[243px] top-[32px] w-[96px]" data-name="Theme">
            <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[#0062ff] text-[14px] tracking-[0.0857px] w-full">
              Theme
            </p>
            <div className="content-stretch flex gap-[4px] h-[32px] items-start relative shrink-0 w-full">
              <a className="bg-[#1c2f3d] content-stretch cursor-pointer flex h-full items-center justify-center px-[15px] py-[7px] relative rounded-[40px] shrink-0">
                <div className="relative shrink-0 size-[16px]" data-name="brightness-sharp-regular">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBrightnessSharpRegular} />
                </div>
              </a>
              <div className="bg-white border border-[#e8e8e8] border-solid content-stretch flex h-full items-center justify-center px-[15px] py-[7px] relative rounded-[40px] shrink-0">
                <div className="h-[21.333px] relative shrink-0 w-[16px]" data-name="moon-sharp-light">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMoonSharpLight} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute contents left-[375px] top-[23px]" data-name="Business Health">
          <div className="absolute h-[33.4px] left-[375px] top-[48.22px] w-[127.582px]" data-name="Numbers">
            <div className="absolute contents left-[46.94px] top-0" data-name="/">
              <p className="[word-break:break-word] absolute bg-clip-text font-normal h-[72.609px] leading-none left-[-31.48px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[78.418px_36px] mask-size-[14.441px_33.398px] not-italic text-[71.615px] text-[transparent] top-[calc(50%-52.7px)] tracking-[-1.5045px] w-[230.863px]" style={{ backgroundImage: "linear-gradient(182.6605978939757deg, rgba(97, 158, 255, 0.44) 37.879%, rgba(0, 98, 255, 0.06) 93.563%)", maskImage: `url("${imgScanYourReceipts}")` }}>
                88/100
              </p>
            </div>
            <p className="[word-break:break-word] absolute bg-[rgba(97,158,255,0.44)] bg-clip-text font-normal leading-none left-[65px] not-italic text-[38.515px] text-[transparent] top-[calc(50%-17.6px)] tracking-[-1.5045px] whitespace-nowrap">
              100
            </p>
            <p className="[word-break:break-word] absolute font-normal leading-none left-0 not-italic opacity-90 text-[38.515px] text-white top-[calc(50%-17.6px)] tracking-[-1.5045px] whitespace-nowrap">
              88
            </p>
          </div>
          <div className="absolute h-[14.835px] left-[376.48px] top-[23px] w-[133.516px]" data-name="Label">
            <p className="[word-break:break-word] absolute font-medium leading-[14.835px] left-0 not-italic text-[10.385px] text-white top-[calc(50%-7.42px)] tracking-[0.0636px] whitespace-nowrap">
              Your Business Health
            </p>
          </div>
        </div>
        <div className="absolute flex items-center justify-center left-[482px] size-[24px] top-[19px]">
          <div className="flex-none rotate-90">
            <div className="relative size-[24px]" data-name="Icon/chevron_right">
              <div className="absolute inset-[26.77%_37.6%_26.77%_35.1%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-8.425px_-6.425px] mask-size-[24px_24px]" style={{ maskImage: `url("${imgChevronRight}")` }} data-name="chevron_right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight1} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[74px] overflow-clip relative shrink-0 w-full z-[2]" data-name="Menu - Customer">
        <div className="absolute flex h-[74px] items-center justify-center left-0 mix-blend-multiply top-0 w-full">
          <div className="-scale-y-100 flex-none rotate-180">
            <div className="h-[74px] relative w-full" data-name="Background" />
          </div>
        </div>
        <div className="absolute bg-[#000245] content-stretch flex items-center justify-between left-0 pr-[32px] top-0 w-full" data-name="Menus Content">
          <div className="content-stretch flex items-center relative shrink-0 w-[763px]" data-name="Buttons">
            <div className="flex flex-row items-center self-stretch">
              <button className="border-[rgba(232,232,232,0.6)] border-r border-solid content-stretch cursor-pointer flex h-full items-center justify-center overflow-clip relative shrink-0 w-[116px]" data-name="Menu">
                <div className="h-[28.53px] relative shrink-0 w-[32px]" data-name="menu">
                  <div className="absolute inset-0 overflow-clip" data-name="menu">
                    <div className="absolute inset-[10.52%_56.25%_54.43%_6.25%]" data-name="Vector">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
                    </div>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex flex-row items-center self-stretch">
              <div className="bg-white content-stretch flex h-full items-center justify-center overflow-clip py-[20px] relative shrink-0 w-[110px]" data-name="Home">
                <div className="h-[33px] relative shrink-0 w-[38px]" data-name="house-sharp-regular 1">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHouseSharpRegular1} />
                </div>
              </div>
            </div>
            <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
              <Link to="/trading?tab=lc&mode=detailed" className="border-[rgba(232,232,232,0.2)] border-r border-solid content-stretch cursor-pointer flex flex-[1_0_0] h-full items-center justify-center min-w-px px-[16px] py-[17px] relative transition-colors hover:bg-[rgba(255,255,255,0.06)]" data-name="Transfer MSN">
                <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">
                  Transfer...MSN
                </p>
              </Link>
            </div>
            <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
              <Link to="/trading?tab=lc&mode=graph" className="border-[rgba(232,232,232,0.2)] border-r border-solid content-stretch cursor-pointer flex flex-[1_0_0] h-full items-center justify-center min-w-px px-[16px] py-[17px] relative transition-colors hover:bg-[rgba(255,255,255,0.06)]" data-name="LC PeakPerf">
                <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">
                  LC...PeakPerf
                </p>
              </Link>
            </div>
          </div>
          <div className="content-stretch flex gap-[8px] items-center justify-end relative shrink-0" data-name="Pinned">
            <div className="relative shrink-0 size-[24px]" data-name="Pin">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPin} />
            </div>
            <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">
              2 Pinned
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
