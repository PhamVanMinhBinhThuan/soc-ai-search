import type { NaturalLanguageSearchResponseDto } from '@/types/soc'
import {
  Activity,
  AlertTriangle,
  Bug,
  Shield,
  ShieldAlert,
  Terminal,
  UserX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SuggestionCategory = 'Next step' | 'Playbook' | 'Aggregation' | 'Raw events'

export type Suggestion = {
  id: string
  category: SuggestionCategory
  title: string
  question: string
  icon: LucideIcon
}

// 5. Thêm Playbook templates tĩnh
const PLAYBOOKS: Suggestion[] = [
  {
    id: 'pb-failed-login',
    category: 'Playbook',
    title: 'Failed login investigation',
    question: 'Show all failed logins grouped by IP in the last 24 hours, then top 10 users with failed logins',
    icon: UserX,
  },
  {
    id: 'pb-privilege',
    category: 'Playbook',
    title: 'Privilege escalation review',
    question: 'Show all successful logins by admin or root in the last 7 days',
    icon: Shield,
  },
  {
    id: 'pb-malware',
    category: 'Playbook',
    title: 'Malware triage',
    question: 'Find all critical alerts containing malware in the last 7 days',
    icon: Bug,
  },
  {
    id: 'pb-firewall',
    category: 'Playbook',
    title: 'Firewall block review',
    question: 'Show top 10 source IPs blocked by firewall in the last 24 hours',
    icon: ShieldAlert,
  },
  {
    id: 'pb-account-lockout',
    category: 'Playbook',
    title: 'Account lockout investigation',
    question: 'Find account lockout events grouped by user in the last 24 hours',
    icon: AlertTriangle,
  },
]

export function getSuggestions(response: NaturalLanguageSearchResponseDto | null): Suggestion[] {
  if (!response) {
    // If no active response, just return playbooks as default suggestions
    return PLAYBOOKS
  }

  const suggestions: Suggestion[] = []
  const filters = response.search_plan.filters
  const aggs = response.search_plan.aggregation
  const mode = response.mode

  // 1. Check if event_type contains failed_login
  if (filters?.event_type?.includes('failed_login')) {
    suggestions.push(
      {
        id: 'fl-1',
        category: 'Aggregation',
        title: 'Top 10 IP failed login 24h',
        question: 'Top 10 IP có nhiều failed login nhất trong 24h qua',
        icon: Activity,
      },
      {
        id: 'fl-2',
        category: 'Aggregation',
        title: 'Failed login by user 7d',
        question: 'Đếm failed login theo user trong 7 ngày qua',
        icon: Activity,
      },
      {
        id: 'fl-3',
        category: 'Aggregation',
        title: 'Failed login by hour 24h',
        question: 'Số failed login theo giờ trong 24h qua',
        icon: Activity,
      },
      {
        id: 'fl-4',
        category: 'Raw events',
        title: 'Admin failed logins',
        question: 'Tìm failed login của user admin',
        icon: Terminal,
      }
    )
  }

  // 2. Check severity critical/high
  if (filters?.severity?.includes('critical') || filters?.severity?.includes('high')) {
    suggestions.push(
      {
        id: 'sev-1',
        category: 'Aggregation',
        title: 'Top hosts with critical alerts 7d',
        question: 'Top host có nhiều critical alert nhất trong 7 ngày qua',
        icon: Activity,
      },
      {
        id: 'sev-2',
        category: 'Aggregation',
        title: 'Critical alerts by source 7d',
        question: 'Đếm alert critical theo source trong 7 ngày qua',
        icon: Activity,
      },
      {
        id: 'sev-3',
        category: 'Aggregation',
        title: 'Critical events by hour 24h',
        question: 'Số critical event theo giờ trong 24h qua',
        icon: Activity,
      }
    )
  }

  // 3. Check Top IP Aggregation
  if (mode === 'aggregation' && response.aggregation_type === 'top_n' && aggs?.field === 'ip') {
    const topIp = response.aggregation_results?.[0]?.key
    if (topIp) {
      suggestions.push({
        id: 'top-ip-1',
        category: 'Next step',
        title: `Latest events from ${topIp}`,
        question: `Tìm event mới nhất từ IP ${topIp}`,
        icon: Terminal,
      })
      if (filters?.event_type?.includes('failed_login')) {
        suggestions.push({
          id: 'top-ip-2',
          category: 'Next step',
          title: `Failed logins from ${topIp}`,
          question: `Tìm failed login từ IP ${topIp} trong 24h qua`,
          icon: Terminal,
        })
      }
    }
  }

  // 4. Check malware/message_query
  if (
    response.search_plan.message_query?.toLowerCase().includes('malware') ||
    filters?.event_type?.includes('malware')
  ) {
    suggestions.push(
      {
        id: 'mal-1',
        category: 'Aggregation',
        title: 'Top hosts with malware 7d',
        question: 'Top host có malware detected trong 7 ngày qua',
        icon: Activity,
      },
      {
        id: 'mal-2',
        category: 'Raw events',
        title: 'Latest malware events',
        question: 'Tìm raw event malware detected mới nhất',
        icon: Terminal,
      }
    )
  }

  // Deduplicate by question
  const uniqueSuggestions = Array.from(new Map(suggestions.map((s) => [s.question, s])).values())

  // If we don't have enough context-specific suggestions, pad with playbooks
  if (uniqueSuggestions.length < 4) {
    for (const pb of PLAYBOOKS) {
      if (uniqueSuggestions.length >= 6) break
      if (!uniqueSuggestions.find((s) => s.question === pb.question)) {
        uniqueSuggestions.push(pb)
      }
    }
  }

  // Return max 6 suggestions
  return uniqueSuggestions.slice(0, 6)
}
