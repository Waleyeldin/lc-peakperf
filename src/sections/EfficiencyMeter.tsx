import imgBg from '../assets/figma/efficiency/imgBg.jpg';
import imgAlef from '../assets/figma/efficiency/imgAlef.svg';
import imgSpark from '../assets/figma/efficiency/imgSpark.svg';
import imgPhoneMockFabCopy from '../assets/figma/efficiency/imgPhoneMockFabCopy.png';
import imgAdcbNotificationExpanded1 from '../assets/figma/efficiency/imgAdcbNotificationExpanded1.jpg';
import imgMPaymentsTrackPaymentsCopy from '../assets/figma/efficiency/imgMPaymentsTrackPaymentsCopy.png';
import imgMPaymentsTrackPaymentsCopy4 from '../assets/figma/efficiency/imgMPaymentsTrackPaymentsCopy4.png';
import imgPhoneMockFabCopy1 from '../assets/figma/efficiency/imgPhoneMockFabCopy1.png';
import imgMPaymentsTrackPaymentsCopy1 from '../assets/figma/efficiency/imgMPaymentsTrackPaymentsCopy1.png';
import imgDivider from '../assets/figma/efficiency/imgDivider.svg';
import imgDivider2 from '../assets/figma/efficiency/imgDivider2.svg';
import imgGroup611 from '../assets/figma/efficiency/imgGroup611.svg';
import imgGroup1321316161 from '../assets/figma/efficiency/imgGroup1321316161.svg';
import imgBook4Spark from '../assets/figma/efficiency/imgBook4Spark.svg';
import imgShape from '../assets/figma/efficiency/imgShape.svg';
import imgGraph from '../assets/figma/efficiency/imgGraph.svg';
import imgFill40 from '../assets/figma/efficiency/imgFill40.svg';
import imgFingerprint from '../assets/figma/efficiency/imgFingerprint.svg';

export default function EfficiencyMeter() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative size-full" data-node-id="1674:26161">
      <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-node-id="1674:26162">
        <p className="[word-break:break-word] font-semibold leading-[20px] min-w-full not-italic relative shrink-0 text-[24px] text-white tracking-[0.0857px] w-[min-content]" data-node-id="1674:26163">
          Efficiency Meter
        </p>
        <div className="flex items-center justify-center relative shrink-0 w-full">
          <div className="-scale-y-100 flex-none w-full">
            <div className="h-0 relative w-full" data-node-id="1674:26164" data-name="Divider">
              <div className="absolute inset-[-0.5px_0]">
                <img alt="" className="block max-w-none size-full" src={imgDivider} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid-cols-[max-content] grid-rows-[max-content] grid leading-[0] place-items-start relative shrink-0 w-full" data-node-id="1674:26165">
        <div className="col-1 content-stretch flex items-center justify-between gap-[32px] ml-0 mt-0 relative row-1 w-full" data-node-id="1674:26166">
          <div className="grid-cols-[minmax(0,1fr)] grid-rows-[max-content] grid leading-[0] place-items-stretch relative flex-1 min-w-0" data-node-id="1674:26167">
            <div className="bg-[rgba(251,251,251,0.08)] col-1 ml-0 mt-[18.96px] overflow-visible relative rounded-[20px] row-1 w-full" data-node-id="1674:26168" data-name="Efficiency">
              {/* AI pill (star + "Would you like me to expand on this?") — overlaps top-right of panel */}
              <div className="absolute right-[40px] top-[2px] z-[10] h-[69px] w-[65px]" data-node-id="886:41395">
                <button className="absolute bg-[#0062ff] block border-2 border-[rgba(0,98,255,0.5)] border-solid cursor-pointer left-0 overflow-clip rounded-[44.231px] size-[65px] top-[2px] z-[3]" data-node-id="886:41396" data-name="Star">
                  <div className="absolute inset-[-97.18%_-90.77%_-132.56%_17.18%]" data-node-id="886:41397" data-name="Alef">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAlef} />
                  </div>
                  <div className="absolute flex h-[183.928px] items-center justify-center left-[-32.06px] mix-blend-multiply top-[-83.04px] w-[153.191px]">
                    <div className="-scale-y-100 flex-none rotate-[160.94deg]">
                      <div className="h-[157.387px] relative w-[107.704px]" data-node-id="886:41398" data-name="BG">
                        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgBg} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[31.138px] left-[calc(50%-0.03px)] top-1/2 w-[29.656px]" data-node-id="886:41399" data-name="Spark">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSpark} />
                  </div>
                </button>
              </div>
              <div className="bg-[#1a1c1e] border border-[#373b3e] border-solid m-[20px] overflow-clip rounded-[12px] flex flex-col" data-node-id="1674:26169" data-name="Path 4 + Shape Mask">
                {/* Header */}
                <div className="relative px-[19px] pt-[20px] pb-[16px]">
                  <p className="[word-break:break-word] font-medium leading-[20px] not-italic text-[14px] text-white tracking-[0.0857px] whitespace-nowrap" data-node-id="1674:26170">
                    Management efficiency
                  </p>
                  <div className="aspect-[20/20] absolute h-[20px] right-[20px] top-[20px]" data-node-id="1674:26189" data-name="book_4_spark">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBook4Spark} />
                  </div>
                </div>
                {/* Horizontal divider under header */}
                <div className="relative h-px w-full shrink-0" data-node-id="1674:26178" data-name="Divider">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgDivider2} />
                  </div>
                </div>
                {/* Three equal metric columns with vertical dividers */}
                <div className="flex items-stretch flex-1">
                  {/* Column 1 — Inconsistent payments */}
                  <div className="flex-1 min-w-0 flex flex-col px-[20px] pt-[20px] pb-[24px]">
                    <p className="font-medium leading-[20px] not-italic text-[14px] text-white tracking-[0.0857px] whitespace-nowrap" data-node-id="1674:26175">
                      Inconsistent payments
                    </p>
                    <p className="font-normal leading-[1.2] text-[#979797] text-[13px] mt-[4px] whitespace-pre" data-node-id="1674:26177">
                      {`We noticed 2 large outgoing payments `}
                      <br aria-hidden />
                      {`which are not consistent with your monthly `}
                    </p>
                    {/* Line graph with vertical bars */}
                    <div className="relative h-[136px] w-[270px] mt-[14px] self-center">
                      <div className="absolute content-stretch flex gap-[51px] h-[136px] items-center left-[1px] top-0 w-[270px]" data-node-id="1674:26202">
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26203" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26204" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26205" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26206" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26207" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                        <div className="h-[96px] relative shrink-0 w-px" data-node-id="1674:26208" data-name="Shape">
                          <div className="absolute inset-[0_1.14%]">
                            <img alt="" className="block max-w-none size-full" src={imgShape} />
                          </div>
                        </div>
                      </div>
                      <div className="absolute left-0 right-0 top-[20px] bottom-[20px]" data-node-id="1674:26217" data-name="Graph">
                        <div className="absolute inset-[-2.3%_-0.77%_0_-0.77%]">
                          <img alt="" className="block max-w-none size-full" src={imgGraph} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-[24px] self-center bg-[rgba(193,8,11,0.1)] border border-[#c1080b] border-solid content-stretch flex items-center justify-center overflow-clip px-[12px] py-[8px] rounded-[5px]" data-node-id="1674:26190" data-name="Group">
                      <p className="[word-break:break-word] font-normal leading-[normal] not-italic relative shrink-0 text-[#c1080b] text-[12px] whitespace-nowrap" data-node-id="1674:26191">
                        Verify now
                      </p>
                    </div>
                  </div>
                  {/* Vertical divider 1 */}
                  <div className="self-stretch w-px shrink-0 bg-[#373b3e]" data-node-id="1674:26171" data-name="Divider" />
                  {/* Column 2 — FX Hedging (64% donut) */}
                  <div className="flex-1 min-w-0 flex flex-col px-[20px] pt-[20px] pb-[24px]">
                    <p className="font-medium leading-[20px] not-italic text-[14px] text-white tracking-[0.0857px] whitespace-nowrap" data-node-id="1674:26174">
                      FX Hedging can save you money
                    </p>
                    <p className="font-normal leading-[1.2] text-[#979797] text-[13px] mt-[4px] whitespace-pre" data-node-id="1674:26176">
                      {`64% of your transactions are in Hong Kong `}
                      <br aria-hidden />
                      {`Dollars. Leverage our FX Hedging to save `}
                      <br aria-hidden />
                      on costs
                    </p>
                    <div className="relative size-[116px] mt-[14px] self-center" data-node-id="1674:26185">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1321316161} />
                      <p className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute font-semibold leading-[normal] left-1/2 not-italic opacity-90 text-[20px] text-center text-white top-1/2 tracking-[-0.8px]" data-node-id="1674:26188">
                        64%
                      </p>
                    </div>
                    <div className="mt-[24px] self-center bg-[rgba(8,193,77,0.1)] border border-[#08c14d] border-solid content-stretch flex items-center justify-center overflow-clip px-[12px] py-[8px] rounded-[5px]" data-node-id="1674:26192" data-name="Group">
                      <p className="[word-break:break-word] font-normal leading-[normal] not-italic relative shrink-0 text-[#08c14d] text-[12px] whitespace-nowrap" data-node-id="1674:26193">
                        Apply now
                      </p>
                    </div>
                  </div>
                  {/* Vertical divider 2 */}
                  <div className="self-stretch w-px shrink-0 bg-[#373b3e]" data-node-id="1674:26172" data-name="Divider" />
                  {/* Column 3 — Transactional Analysis (82% donut) */}
                  <div className="flex-1 min-w-0 flex flex-col px-[20px] pt-[20px] pb-[24px]">
                    <p className="font-medium leading-[20px] not-italic text-[14px] text-white tracking-[0.0857px] whitespace-nowrap" data-node-id="1674:26195">
                      Transactional Analysis
                    </p>
                    <p className="font-normal leading-[1.2] text-[#979797] text-[13px] mt-[4px] whitespace-pre" data-node-id="1674:26196">
                      {`We notice you have a shortfall of 18% in `}
                      <br aria-hidden />
                      {`your payment ability this month. Would `}
                      <br aria-hidden />
                      you like a payroll facility extension?
                    </p>
                    <div className="relative h-[113.526px] w-[111px] mt-[16px] self-center" data-node-id="1674:26180">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup611} />
                      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-semibold justify-center leading-[0] left-1/2 not-italic opacity-90 text-[20px] text-center text-white top-1/2 tracking-[-0.8px]" data-node-id="1674:26183">
                        <p className="leading-[normal]">82%</p>
                      </div>
                    </div>
                    <div className="mt-[20px] self-center bg-[rgba(8,193,77,0.1)] border border-[#08c14d] border-solid content-stretch flex items-center justify-center overflow-clip px-[12px] py-[8px] rounded-[5px]" data-node-id="1674:26197" data-name="Group">
                      <p className="[word-break:break-word] font-normal leading-[normal] not-italic relative shrink-0 text-[#08c14d] text-[12px] whitespace-nowrap" data-node-id="1674:26198">
                        Apply now
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* AI pill content bubble — overlaps bottom of panel */}
              <div className="absolute bg-[#ccdff7] content-stretch flex h-[69px] items-center left-[40px] px-[28px] py-[25px] rounded-[128px] bottom-[-20px] z-[5]" data-node-id="886:41401" data-name="Content">
                <p className="[word-break:break-word] font-semibold leading-[14px] not-italic relative shrink-0 text-[#003da6] text-[16px] tracking-[0.0571px] whitespace-nowrap" data-node-id="886:41402">{`Would you like me to expand on this? `}</p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[38px] items-center relative shrink-0 w-[312px]" data-node-id="1674:26221">
            <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1674:26222" data-name="Marketing">
              <div className="bg-[#0062ff] col-1 h-[191px] ml-0 mt-0 overflow-clip relative rounded-[8px] row-1 w-[312px]" data-node-id="1674:26223" data-name="Path 4 + Shape Mask">
                <div className="absolute h-[296px] left-[-2px] top-[-5px] w-[648px]" data-node-id="1674:26224" style={{ backgroundImage: "linear-gradient(225.6040176711217deg, rgb(142, 185, 255) 16.421%, rgb(23, 43, 133) 92.089%)" }} />
                <div className="absolute inset-[-89.53%_-24.84%_-483.77%_18.4%] mix-blend-color-burn" data-node-id="1674:26225" data-name="Fill 40">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgFill40} />
                </div>
                <div className="absolute flex inset-[-36.65%_-31.41%_-243.46%_19.87%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                    <div className="relative size-full" data-node-id="1674:26226" data-name="phone_mock_Fab Copy">
                      <img alt="" className="absolute inset-0 max-w-none object-bottom pointer-events-none size-full" src={imgPhoneMockFabCopy} />
                    </div>
                  </div>
                </div>
                <div className="absolute aspect-[221/109] left-[61.54%] right-[-8.01%] rounded-[20px] shadow-[-4px_4px_17px_0px_rgba(0,0,0,0.25)] top-[41px]" data-node-id="1674:26227" data-name="ADCB Notification Expanded 1">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px]">
                    <img alt="" className="absolute h-[261.54%] left-[-4.63%] max-w-none top-[-10.77%] w-[110.11%]" src={imgAdcbNotificationExpanded1} />
                  </div>
                </div>
                <div className="[word-break:break-word] absolute font-semibold leading-[0] left-[20px] not-italic text-[24px] text-white top-[calc(50%-74.5px)] tracking-[0.0857px] w-[213px] whitespace-pre-wrap" data-node-id="1674:26228">
                  <p className="leading-[1.15] mb-0">{`Leveraging `}</p>
                  <p className="leading-[1.15]">Our AI Tools</p>
                </div>
                <p className="[word-break:break-word] absolute font-normal leading-[1.16] left-[6.41%] not-italic right-[47.44%] text-[12px] text-white top-[calc(50%-3.5px)]" data-node-id="1674:26229">
                  Maximising Operational Efficiency with FAB&rsquo;s Customised Solutions.
                </p>
                <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-white content-stretch flex h-[30px] items-center justify-center left-[calc(50%-91.5px)] overflow-clip pb-[10px] pt-[6px] px-[14px] rounded-[16px] top-[calc(50%+62.5px)] w-[89px]" data-node-id="1674:26230" data-name="CTA">
                  <p className="[word-break:break-word] font-medium leading-[20px] not-italic relative shrink-0 text-[#3c57ab] text-[12px] text-center tracking-[0.0857px] whitespace-nowrap" data-node-id="1674:26231">
                    Know more
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[173px] overflow-clip relative rounded-[10px] shrink-0 w-[310px]" data-node-id="1674:26232" style={{ backgroundImage: "linear-gradient(88.01743023876972deg, rgb(0, 98, 255) 0.82808%, rgb(71, 141, 254) 99.146%)" }}>
              <p className="[word-break:break-word] absolute font-medium inset-[8.09%_49.3%_73.89%_7.42%] leading-[20px] not-italic text-[15px] text-white tracking-[0.0857px]" data-node-id="1674:26235">
                Secure Account
              </p>
              <p className="[word-break:break-word] absolute font-normal inset-[23.7%_36.24%_63.69%_7.42%] leading-[1.04] not-italic text-[13px] text-white" data-node-id="1674:26236">
                Double authentication.
              </p>
              <div className="absolute contents left-[20px] top-[-65.46px]" data-node-id="1674:26237">
                <div className="absolute flex inset-[39.73%_18.77%_-35%_30.49%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[hypot(43.1784cqw,69.5093cqh)] rotate-[-29.35deg] skew-x-[1.32deg] w-[hypot(56.8216cqw,-30.4907cqh)]">
                    <div className="relative size-full" data-node-id="1674:26238" data-name="(M) Payments - Track Payments Copy">
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgMPaymentsTrackPaymentsCopy} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute flex inset-[40.25%_18.97%_-34.35%_30.96%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[hypot(43.2663cqw,69.5851cqh)] rotate-[-29.35deg] skew-x-[1.32deg] w-[hypot(56.7337cqw,-30.4149cqh)]">
                    <div className="relative size-full" data-node-id="1674:26239" data-name="(M) Payments - Track Payments Copy 4">
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgMPaymentsTrackPaymentsCopy4} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute flex inset-[4.3%_-16.82%_-115.03%_11.19%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[hypot(49.0184cqw,74.2565cqh)] rotate-[-29.35deg] skew-x-[1.32deg] w-[hypot(50.9816cqw,-25.7435cqh)]">
                    <div className="relative size-full" data-node-id="1674:26240" data-name="phone_mock_Fab Copy">
                      <img alt="" className="absolute inset-0 max-w-none object-bottom pointer-events-none size-full" src={imgPhoneMockFabCopy1} />
                    </div>
                  </div>
                </div>
                <div className="absolute flex inset-[-2.24%_-15.39%_8.52%_65.44%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[hypot(43.1272cqw,69.465cqh)] rotate-[-29.35deg] skew-x-[1.32deg] w-[hypot(56.8728cqw,-30.535cqh)]">
                    <div className="relative size-full" data-node-id="1674:26241" data-name="(M) Payments - Track Payments Copy">
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgMPaymentsTrackPaymentsCopy1} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute flex inset-[-37.84%_-51.31%_-72.89%_45.69%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[hypot(49.0184cqw,74.2565cqh)] rotate-[-29.35deg] skew-x-[1.32deg] w-[hypot(50.9816cqw,-25.7435cqh)]">
                    <div className="relative size-full" data-node-id="1674:26242" data-name="phone_mock_Fab">
                      <img alt="" className="absolute inset-0 max-w-none object-bottom pointer-events-none size-full" src={imgPhoneMockFabCopy1} />
                    </div>
                  </div>
                </div>
                <div className="absolute left-[20px] size-[37px] top-[66px]" data-node-id="1674:26243" data-name="fingerprint">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgFingerprint} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
