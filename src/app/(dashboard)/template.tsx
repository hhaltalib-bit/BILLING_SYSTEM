// A template (unlike a layout) remounts on every navigation, so the
// fade-in animation replays each time the page changes.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
