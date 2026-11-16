import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/axios'
import { endpoints } from '../../api/endpoints'
import type { ApiResponse } from '../../api/types/api'
import { useAuth } from '../../features/auth/AuthContext'
import { outerNavigate, useOuterPath } from '../../lib/outerHistory'
import { useTheme } from '../../lib/ThemeContext'
import { TabWorkspaceProvider, useTabWorkspace } from '../../lib/tabWorkspace/TabWorkspaceContext'
import { MenuIconFor } from '../ui/menuIcons'
import { TabbedWorkspace } from './TabbedWorkspace'
import { TabStrip } from './TabStrip'

export interface MenuNode {
  id: number
  parentId: number | null
  title: string
  icon: string | null
  path: string | null
  permissionCode: string | null
  sortOrder: number
  isActive: boolean
  children: MenuNode[]
}

export function useMyMenu() {
  return useQuery({
    queryKey: ['menus', 'my'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MenuNode[]>>(endpoints.myMenu)
      return data.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

function nodeMatches(node: MenuNode, query: string): boolean {
  if (node.title.toLowerCase().includes(query)) return true
  return node.children.some((child) => nodeMatches(child, query))
}

function filterMenu(nodes: MenuNode[], query: string): MenuNode[] {
  if (!query) return nodes
  return nodes
    .filter((node) => nodeMatches(node, query))
    .map((node) => (node.children.length ? { ...node, children: filterMenu(node.children, query) } : node))
}

/** A node's path "owns" a route if the route is that path exactly, or a sub-path of it. */
function pathOwnsRoute(nodePath: string | null, pathname: string): boolean {
  if (!nodePath) return false
  if (nodePath === '/') return pathname === '/'
  return pathname === nodePath || pathname.startsWith(`${nodePath}/`)
}

/**
 * Depth-first search for the menu node that owns the current route.
 */
export function findActiveNode(nodes: MenuNode[], pathname: string): { node: MenuNode; group: MenuNode | null } | null {
  function search(list: MenuNode[], parent: MenuNode | null): { node: MenuNode; group: MenuNode | null } | null {
    let best: { node: MenuNode; group: MenuNode | null } | null = null
    let bestLength = -1

    for (const node of list) {
      if (pathOwnsRoute(node.path, pathname) && (node.path?.length ?? 0) > bestLength) {
        best = { node, group: parent }
        bestLength = node.path!.length
      }
      const nested = search(node.children, node)
      if (nested && (nested.node.path?.length ?? 0) > bestLength) {
        best = nested
        bestLength = nested.node.path!.length
      }
    }
    return best
  }

  return search(nodes, null)
}

function titleCase(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function resolveTabMeta(menu: MenuNode[], path: string): { label: string; icon: string | null } {
  const pathname = path.split('?')[0]!
  const exact = findActiveNode(menu, pathname)
  if (exact) return { label: exact.node.title, icon: exact.node.icon }

  const firstSegment = `/${pathname.split('/').filter(Boolean)[0] ?? ''}`
  const group = menu.find((g) => g.path === firstSegment || g.children.some((c) => c.path?.startsWith(firstSegment)))
  if (group) return { label: group.title, icon: group.icon }

  const lastSegment = pathname.split('/').filter(Boolean).pop()
  return { label: lastSegment ? titleCase(lastSegment) : 'Home', icon: null }
}

function containsNode(node: MenuNode, activeNodeId: number | null): boolean {
  if (activeNodeId == null) return false
  return node.children.some((child) => child.id === activeNodeId || containsNode(child, activeNodeId))
}

function SidebarNode({
  node,
  activeNodeId,
  forceOpen,
  collapsed,
  onExpandSidebar,
  depth = 0,
}: {
  node: MenuNode
  activeNodeId: number | null
  forceOpen: boolean
  collapsed: boolean
  onExpandSidebar: () => void
  depth?: number
}) {
  const holdsActive = containsNode(node, activeNodeId)
  const [open, setOpen] = useState(holdsActive)
  useEffect(() => {
    if (holdsActive) setOpen(true)
  }, [holdsActive])

  const { openTab, openInActiveTab } = useTabWorkspace()
  const isActive = node.id === activeNodeId
  const hasChildren = node.children.length > 0
  const isOpen = !collapsed && (forceOpen || open)

  const isAppointments = node.title.toLowerCase().includes('appointment')
  const badgeEl = isAppointments ? (
    <span className="ml-auto rounded-full border border-[rgba(198,99,40,0.35)] bg-[rgba(198,99,40,0.18)] px-[7px] py-[1px] text-[11px] font-extrabold text-[#e0a989]">
      24
    </span>
  ) : null

  const linkClass = `group relative flex items-center gap-[11px] rounded-[11px] px-[10px] py-[9px] text-[13.2px] font-medium transition-all ${
    collapsed ? 'justify-center' : ''
  } ${
    isActive
      ? 'bg-gradient-to-r from-[rgba(198,99,40,0.95)] to-[rgba(198,99,40,0.55)] text-white font-medium shadow-[0_10px_22px_-10px_rgba(198,99,40,0.8),inset_0_1px_0_rgba(255,255,255,0.35)]'
      : holdsActive
      ? 'bg-white/10 text-white font-semibold'
      : 'text-[#d6d2cb] hover:bg-white/6 hover:text-white'
  }`

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (e.metaKey || e.ctrlKey) {
      openTab(path)
    } else {
      openInActiveTab(path)
    }
  }

  const childList = hasChildren && isOpen && (
    <div className="mt-1 ml-3.5 space-y-0.5 border-l border-white/10 pl-2">
      {node.children.map((child) => (
        <SidebarNode
          key={child.id}
          node={child}
          activeNodeId={activeNodeId}
          forceOpen={forceOpen}
          collapsed={collapsed}
          onExpandSidebar={onExpandSidebar}
          depth={depth + 1}
        />
      ))}
    </div>
  )

  // A node with both path AND children
  if (node.path && hasChildren) {
    const path = node.path
    return (
      <div>
        <div className={`flex items-center gap-0.5 ${collapsed ? 'flex-col' : ''}`}>
          <a href={path} title={collapsed ? node.title : undefined} onClick={handleLinkClick(path)} className={`min-w-0 flex-1 ${linkClass}`}>
            <span className="flex size-4.5 shrink-0 items-center justify-center text-inherit">
              <MenuIconFor name={node.icon} />
            </span>
            {!collapsed && <span className="truncate">{node.title}</span>}
            {!collapsed && badgeEl}
          </a>
          {!collapsed && (
            <button
              type="button"
              title={isOpen ? 'Collapse' : 'Expand'}
              onClick={() => setOpen((value) => !value)}
              className="flex shrink-0 items-center justify-center rounded-[8px] p-2 text-[#8d8880] hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronDown className={`size-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden />
            </button>
          )}
        </div>
        {childList}
      </div>
    )
  }

  // Regular leaf node with a path
  if (node.path) {
    const path = node.path
    return (
      <a href={path} title={collapsed ? node.title : undefined} onClick={handleLinkClick(path)} className={linkClass}>
        <span className="flex size-4.5 shrink-0 items-center justify-center text-inherit">
          <MenuIconFor name={node.icon} />
        </span>
        {!collapsed && <span className="truncate">{node.title}</span>}
        {!collapsed && badgeEl}
        {!collapsed && !badgeEl && (
          <span className={`ml-auto text-sm transition-all ${isActive ? 'text-white opacity-90' : 'opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5'}`}>
            ›
          </span>
        )}
      </a>
    )
  }

  // Group node without path (expandable menu item)
  return (
    <div>
      <button
        type="button"
        title={collapsed ? node.title : undefined}
        onClick={() => {
          if (collapsed) {
            onExpandSidebar()
            setOpen(true)
            return
          }
          setOpen((value) => !value)
        }}
        aria-expanded={hasChildren ? isOpen : undefined}
        className={`group flex w-full items-center gap-[11px] rounded-[11px] px-[10px] py-[9px] text-[13.2px] font-medium transition-all ${
          collapsed ? 'justify-center' : ''
        } ${
          holdsActive
            ? 'bg-white/10 text-white font-semibold'
            : 'text-[#d6d2cb] hover:bg-white/6 hover:text-white'
        }`}
      >
        <span className="flex size-4.5 shrink-0 items-center justify-center text-inherit">
          <MenuIconFor name={node.icon} />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{node.title}</span>
            {badgeEl}
            <ChevronDown className={`size-3.5 text-[#8d8880] transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden />
          </>
        )}
      </button>
      {childList}
    </div>
  )
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function roleLabel(roles: string[]) {
  if (!roles.length) return 'Staff'
  return roles[0]
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}

function ChangePasswordMenuItem({ onDone }: { onDone: () => void }) {
  const { openTab } = useTabWorkspace()
  return (
    <button
      type="button"
      onClick={() => {
        onDone()
        openTab('/change-password')
      }}
      className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-ink-muted hover:bg-panel-2 hover:text-ink transition-colors"
    >
      <KeyRound className="size-4" aria-hidden /> Change password
    </button>
  )
}

const SIDEBAR_KEY = 'prixo.sidebar.collapsed'
const MENU_SEARCH_ID = 'prixo-menu-search'

export function AppShell() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const outerPath = useOuterPath()
  const { data: menu = [] } = useMyMenu()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1')
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const trimmedSearch = menuSearch.trim().toLowerCase()
  const visibleMenu = filterMenu(menu, trimmedSearch)

  const active = useMemo(() => findActiveNode(menu, outerPath.split('?')[0]!), [menu, outerPath])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCollapsed(false)
        requestAnimationFrame(() => document.getElementById(MENU_SEARCH_ID)?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    await logout()
    outerNavigate('/login', { replace: true })
  }

  return (
    <TabWorkspaceProvider>
      <div className="relative flex h-dvh overflow-hidden bg-[#f7f2ec] text-[#191919] dark:bg-[#141414] dark:text-[#f5ede0]">
        {/* Subtle background glow & grid matching the dashboard theme */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(700px_380px_at_18%_-8%,rgba(198,99,40,0.12),transparent_60%),radial-gradient(600px_420px_at_88%_0%,rgba(198,99,40,0.12),transparent_60%),radial-gradient(900px_600px_at_50%_110%,rgba(198,161,91,0.10),transparent_60%)]" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(25,25,25,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(25,25,25,.035) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(90% 70% at 50% 0%, black 30%, transparent 100%)',
            }}
          />
        </div>

        {/* Sidebar matching dashboard.html / Pravo Hospital OS theme */}
        <aside
          style={{
            background: 'linear-gradient(180deg, #191919 0%, #1c1c1c 55%, #191919 100%)',
          }}
          className={`relative z-30 flex min-h-0 shrink-0 flex-col border-r border-white/8 text-[#ebe8e3] shadow-xl transition-[width] duration-200 ${
            collapsed ? 'w-[84px]' : 'w-[288px]'
          }`}
        >
          {/* Ambient glow pseudo-elements on sidebar */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_220px_at_20%_0%,rgba(198,99,40,0.35),transparent_70%),radial-gradient(360px_260px_at_90%_30%,rgba(198,99,40,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

          {/* Toggle sidebar button */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute top-4.5 -right-3 z-40 flex size-6 items-center justify-center rounded-full border border-white/20 bg-[#1c1c1c] text-[#d6d2cb] shadow-md hover:bg-[#2a2a2a] hover:text-white transition-all"
          >
            {collapsed ? <ChevronRight className="size-3" aria-hidden /> : <ChevronLeft className="size-3" aria-hidden />}
          </button>

          {/* Brand Header with logo-dark.svg */}
          <div className={`relative flex items-center gap-3 p-[18px_16px_14px] ${collapsed ? 'justify-center px-0' : ''}`}>
            <img
              src="/logo-dark.svg"
              alt="Pravo Hospital OS"
              className={collapsed ? 'size-[38px] object-contain' : 'h-[42px] w-auto max-w-[196px] object-contain'}
            />
          </div>

          {/* Search bar inside sidebar */}
          {!collapsed && (
            <div className="relative mx-[14px] mt-[2px] mb-[12px]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-[10px] size-3.5 -translate-y-1/2 text-[#8d8880]" aria-hidden />
                <input
                  id={MENU_SEARCH_ID}
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setMenuSearch('')
                  }}
                  placeholder="Search menu…"
                  aria-label="Search menu"
                  className="w-full rounded-[11px] border border-white/12 bg-white/7 py-[10px] pr-[52px] pl-[34px] text-[13px] text-[#ebe8e3] outline-none placeholder:text-[#8d8880] focus:border-[rgba(198,99,40,0.7)] focus:bg-white/10 focus:ring-0 focus:shadow-[0_0_0_3px_rgba(198,99,40,0.25)] transition-all"
                />
                {!menuSearch ? (
                  <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-[6px] border border-white/12 bg-white/8 px-[6px] py-[2px] text-[10.5px] font-semibold text-[#b5b0a6]">
                    Ctrl K
                  </kbd>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMenuSearch('')}
                    aria-label="Clear menu search"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#8d8880] hover:text-white"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="relative min-h-0 flex-1 space-y-1 overflow-y-auto px-[10px] pt-[2px] pb-[10px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {visibleMenu.length === 0 && trimmedSearch && (
              <p className="px-3 py-2 text-xs text-[#8d8880]">No menu items match "{menuSearch.trim()}".</p>
            )}
            {visibleMenu.map((node) => (
              <SidebarNode
                key={node.id}
                node={node}
                activeNodeId={active?.node.id ?? null}
                forceOpen={!!trimmedSearch}
                collapsed={collapsed}
                onExpandSidebar={() => setCollapsed(false)}
                depth={0}
              />
            ))}
          </nav>

          {/* Sidebar Footer with user info & status */}
          <div className="relative shrink-0 border-t border-white/8 bg-black/18 p-[12px_14px_14px]">
            <div className={`flex items-center gap-[10px] rounded-[14px] border border-white/10 bg-white/7 p-[10px] transition-all ${collapsed ? 'justify-center p-2' : ''}`}>
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#ffe9b8] to-[#c6a15b] font-display text-[12px] font-extrabold text-[#0a1330] shadow-sm">
                {user ? initialsOf(user.fullName) : 'SA'}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold text-white leading-tight">{user?.fullName ?? 'System Administrator'}</div>
                  <div className="truncate text-[11px] text-[#93a2d1]">{user ? roleLabel(user.roles) : 'Super Admin'} • {user?.branchName ?? 'Main Branch'}</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-2.5 flex items-center gap-2 px-1 text-[11px] text-[#a09a90]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c66328] opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-[#c66328]"></span>
                </span>
                <span>Signed in • {user?.branchName ?? 'Main Branch'} • v4.2</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top Bar Header */}
          <header className="relative z-20 flex h-[58px] shrink-0 items-center gap-[14px] border-b border-[#e5e9f2] bg-white/95 backdrop-blur-md px-[22px] text-[#191919] shadow-none dark:border-white/8 dark:bg-[#191919] dark:text-[#ebe8e3]">
            {/* Left Page Title / Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-[#c66328] border border-[#9e4f20] text-white shadow-none">
                <MenuIconFor name={active?.node.icon ?? 'layout-dashboard'} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display truncate text-[14px] font-bold text-[#191919] leading-[1.1] dark:text-white">
                    {active?.node.title ?? 'Dashboard'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eed0be] bg-[#f8ece5] px-[9px] py-[3px] text-[11px] font-bold text-[#9e4f20] dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    <span className="size-[7px] rounded-full bg-[#9e4f20] dark:bg-[#e0a989] inline-block" />
                    {user?.branchName ?? 'Main Branch'}
                  </span>
                </div>
                <div className="truncate text-[11.5px] text-[#5b6a8a] dark:text-[#a09a90]">
                  {active?.node.path === '/' || active?.node.title === 'Dashboard'
                    ? 'Cross-branch reporting • live'
                    : `${active?.group?.title ? `${active.group.title} • ` : ''}Hospital Information System • live`}
                </div>
              </div>
            </div>

            {/* Right Top Actions */}
            <div className="ml-auto flex items-center gap-2.5">
              {/* Shortcut search badge */}
              <button
                type="button"
                onClick={() => {
                  setCollapsed(false)
                  requestAnimationFrame(() => document.getElementById(MENU_SEARCH_ID)?.focus())
                }}
                className="hidden sm:flex size-[34px] items-center justify-center rounded-[11px] border border-[#e5e9f2] bg-white text-xs font-semibold text-[#42506b] hover:bg-[#f7ebdd] hover:border-[#dcc7a8] shadow-none dark:border-white/10 dark:bg-white/5 dark:text-[#c2cdf3] transition-all"
                title="Search menu (Ctrl+K)"
              >
                ⌘
              </button>

              {/* Notifications bell */}
              <button
                type="button"
                className="relative flex size-[34px] items-center justify-center rounded-[11px] border border-[#e5e9f2] bg-white text-[#42506b] hover:bg-[#f7ebdd] hover:border-[#dcc7a8] shadow-none dark:border-white/10 dark:bg-white/5 dark:text-[#c2cdf3] transition-all"
                title="Notifications"
              >
                <Bell className="size-4" aria-hidden />
                <span className="absolute top-[7px] right-[8px] size-2 rounded-full border-2 border-white bg-[#ff5470] dark:border-[#191919]" />
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title="Toggle theme"
                className="flex size-[34px] items-center justify-center rounded-[11px] border border-[#e5e9f2] bg-white text-[#42506b] hover:bg-[#f7ebdd] hover:border-[#dcc7a8] shadow-none dark:border-white/10 dark:bg-white/5 dark:text-[#c2cdf3] transition-all"
              >
                {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              </button>

              {/* User menu chip */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2.5 rounded-[13px] border border-[#e5e9f2] bg-white p-[5px_10px_5px_5px] text-[#191919] shadow-none transition-all hover:bg-[#f7ebdd] hover:border-[#dcc7a8] dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#9e4f20] text-xs font-extrabold text-white shadow-none">
                    {user ? initialsOf(user.fullName) : 'SA'}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-[12.5px] font-bold leading-[1.1] text-[#191919] dark:text-white truncate max-w-[140px]">
                      {user?.fullName ?? 'System Administrator'}
                    </div>
                    <div className="text-[11px] text-[#5b6a8a] dark:text-[#a09a90] truncate max-w-[140px]">
                      {user ? roleLabel(user.roles) : 'Super Admin'} • Shift A
                    </div>
                  </div>
                  <ChevronDown className="size-3.5 text-[#5b6a8a] dark:text-[#a09a90]" aria-hidden />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 z-30 mt-1.5 w-52 rounded-[14px] border border-[#e5e9f2] bg-white py-1.5 shadow-xl dark:border-white/10 dark:bg-[#191919]"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <ChangePasswordMenuItem onDone={() => setUserMenuOpen(false)} />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-sm font-semibold text-crit hover:bg-crit/10 transition-colors"
                    >
                      <LogOut className="size-4" aria-hidden /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Browser tabs strip */}
          <TabStrip />

          {/* Page workspace */}
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <TabbedWorkspace />
          </main>
        </div>
      </div>
    </TabWorkspaceProvider>
  )
}
