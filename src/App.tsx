import Header from './sections/Header'
import Overview from './sections/Overview'
import Tracker from './sections/Tracker'
import QuickTasks from './sections/QuickTasks'
import TransactionOverview from './sections/TransactionOverview'
import RelevantNews from './sections/RelevantNews'
import EfficiencyMeter from './sections/EfficiencyMeter'

/**
 * FAB eAccess Redesign — Desktop Homepage / Landing Dashboard (Dark Mode).
 * Figma frame 1674-25339, designed at 1440px.
 *
 * The layout is fluid: the frame fills the full viewport width and each section
 * stretches its primary panels to fill the available space, while text, icons,
 * paddings and the fixed sidebars keep their design sizes (no scaling/zoom — so
 * type never balloons on wide screens). A max width keeps line lengths sane on
 * ultra-wide monitors; the content column has 48px side gutters and sections
 * are stacked with a constant 57px vertical gap, as in the design.
 */
function App() {
  return (
    <div className="mx-auto w-full min-w-[1392px] max-w-[2200px] bg-page">
      <Header />
      <main className="flex flex-col gap-[57px] px-[47.75px] pt-12 pb-24">
        <Overview />
        <Tracker />
        <QuickTasks />
        <TransactionOverview />
        <RelevantNews />
        <EfficiencyMeter />
      </main>
    </div>
  )
}

export default App
