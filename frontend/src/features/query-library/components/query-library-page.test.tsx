import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

import { QueryLibraryPage } from './query-library-page'

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

describe('QueryLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the page title and initial query cards', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)
    
    // Page Title
    expect(screen.getByRole('heading', { name: /Query Library/i })).toBeInTheDocument()
    
    // Shows some default queries (e.g. from the ALL category)
    expect(screen.getByText(/Show me failed login attempts from China/i)).toBeInTheDocument()
    expect(screen.getByText(/Show critical events in the last 7 days/i)).toBeInTheDocument()
  })

  it('paginates query cards ten per page', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)

    expect(screen.getByText(/Show me failed login attempts from China/i)).toBeInTheDocument()
    expect(screen.getByText(/Show critical events in the last 7 days/i)).toBeInTheDocument()
    expect(screen.getByText(/Show account lockout events in the last 7 days/i)).toBeInTheDocument()
    expect(screen.getByText(/Show firewall block events from China/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Next page/i }))

    expect(screen.queryByText(/Show me failed login attempts from China/i)).not.toBeInTheDocument()
  })

  it('filters by search input', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)
    
    const searchInput = screen.getByPlaceholderText(/Search queries, tags/i)
    
    // Search for something specific
    fireEvent.change(searchInput, { target: { value: 'firewall block' } })
    
    // Should show firewall related query
    expect(screen.getByText(/Show firewall block events from China/i)).toBeInTheDocument()
    // Should hide unrelated query
    expect(screen.queryByText(/Count all events in the last 24 hours/i)).not.toBeInTheDocument()
  })

  it('filters by category chips', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)
    
    // Initially shows search queries
    expect(screen.getByText(/Show me failed login attempts from China/i)).toBeInTheDocument()
    
    // Click 'Count' category
    const countCategoryBtn = screen.getByRole('button', { name: /^Count$/ })
    fireEvent.click(countCategoryBtn)
    
    // Should show count query
    expect(screen.getByText(/Count all events in the last 24 hours/i)).toBeInTheDocument()
    // Should hide search query
    expect(screen.queryByText(/Show me failed login attempts from China/i)).not.toBeInTheDocument()
  })

  it('handles empty state when no matches found', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)
    
    const searchInput = screen.getByPlaceholderText(/Search queries, tags/i)
    fireEvent.change(searchInput, { target: { value: 'thisisatotallyrandomstringthatwillnotmatch' } })
    
    expect(screen.getByText(/No matching queries/i)).toBeInTheDocument()
    expect(screen.getByText(/Try another keyword or clear filters/i)).toBeInTheDocument()
  })

  it('calls onUseQuery when Use button is clicked', () => {
    const handleUse = vi.fn()
    render(<QueryLibraryPage onUseQuery={handleUse} />)
    
    // Find the 'Use this query' buttons
    const useButtons = screen.getAllByRole('button', { name: /Use this query/i })
    
    // Click the first one
    fireEvent.click(useButtons[0])
    
    // Should have called the handler with the text of the first query
    expect(handleUse).toHaveBeenCalledTimes(1)
    expect(handleUse).toHaveBeenCalledWith('Show me failed login attempts from China in the last 24h')
  })

  it('calls clipboard API when Copy button is clicked', () => {
    render(<QueryLibraryPage onUseQuery={vi.fn()} />)
    
    const copyButtons = screen.getAllByRole('button', { name: /Copy query/i })
    fireEvent.click(copyButtons[0])
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Show me failed login attempts from China in the last 24h')
  })
})
