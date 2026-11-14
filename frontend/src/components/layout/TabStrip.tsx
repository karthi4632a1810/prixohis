import { Columns2, X } from 'lucide-react'
import { MenuIconFor } from '../ui/menuIcons'
import { resolveTabMeta, useMyMenu } from './AppShell'
import { useTabWorkspace, type WorkspaceTab } from '../../lib/tabWorkspace/TabWorkspaceContext'

/** The browser-tab-like strip under the header — one entry per open workspace tab, plus the Split toggle. */
export function TabStrip() {
  const { data: menu = [] } = useMyMenu()
  const { tabs, activeTabId, splitTabId, activateTab, closeTab, toggleSplit } = useTabWorkspace()

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#e2e8f2] bg-[#f0f3f8] px-4 dark:border-white/8 dark:bg-[#0a1020]">
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <TabChip
            key={tab.id}
            tab={tab}
            meta={resolveTabMeta(menu, tab.path)}
            isActive={tab.id === activeTabId || tab.id === splitTabId}
            isPrimary={tab.id === activeTabId}
            canClose={tabs.length > 1}
            onActivate={() => activateTab(tab.id)}
            onClose={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={toggleSplit}
        title="Split view"
        className={`flex shrink-0 items-center gap-1.5 rounded-[11px] border px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
          splitTabId
            ? 'border-[#3b62ff] bg-gradient-to-r from-[#2348ff] to-[#1a34c8] text-white shadow-[0_4px_12px_-4px_rgba(35,72,255,0.5)]'
            : 'border-[#e5e9f2] bg-white text-[#42506b] hover:border-[#c6d0e8] hover:text-[#0e1b33] dark:border-white/10 dark:bg-white/5 dark:text-[#c2cdf3]'
        }`}
      >
        <Columns2 className="size-3.5" aria-hidden />
        Split
      </button>
    </div>
  )
}

function TabChip({
  tab,
  meta,
  isActive,
  isPrimary,
  canClose,
  onActivate,
  onClose,
}: {
  tab: WorkspaceTab
  meta: { label: string; icon: string | null }
  isActive: boolean
  isPrimary: boolean
  canClose: boolean
  onActivate: () => void
  onClose: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`group flex shrink-0 items-center rounded-[11px] border transition-all ${
        isActive
          ? 'border-[#e5e9f2] bg-white text-[#1a34c8] shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] dark:border-white/15 dark:bg-[#121c38] dark:text-[#7a9aff]'
          : 'border-transparent text-[#627290] hover:bg-white/60 hover:text-[#0e1b33] dark:text-[#8fa0d6] dark:hover:bg-white/5 dark:hover:text-white'
      } ${isPrimary && isActive ? 'font-bold' : 'font-medium'}`}
    >
      <button
        type="button"
        onClick={onActivate}
        onAuxClick={(e) => {
          if (e.button === 1 && canClose) onClose(e)
        }}
        title={tab.path}
        aria-current={isActive ? 'page' : undefined}
        className="flex items-center gap-2 py-[7px] pl-2.5 pr-2 text-[12px]"
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-[7px] text-[11px] ${
            isActive
              ? 'bg-[#e9edff] text-[#2348ff] dark:bg-[#1e2a52] dark:text-[#6d8eff]'
              : 'text-inherit opacity-70'
          }`}
        >
          <MenuIconFor name={meta.icon} />
        </span>
        <span className="whitespace-nowrap">{meta.label}</span>
      </button>
      {canClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${meta.label}`}
          title={`Close ${meta.label}`}
          className={`mr-1.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[#8fa0d6] transition-all hover:bg-black/5 hover:text-[#0e1b33] dark:hover:bg-white/10 dark:hover:text-white ${
            isActive ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </div>
  )
}
