import Navbar from './Navbar';
import ChatDock from './ChatDock';

// The three-column app shell shared by every authenticated screen:
//   1. Navbar   - fixed-width navigation rail on the left
//   2. main     - the scrollable content region in the middle (the largest
//                 area; dashboard / tasks / pipeline render here)
//   3. ChatDock - the docked assistant panel on the right
// Pages render ONLY their own content; this frame keeps every screen aligned
// identically instead of each page re-declaring its own flex + navbar wrapper.
export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas dark:bg-canvas-dark">
      <Navbar />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      <ChatDock />
    </div>
  );
}
