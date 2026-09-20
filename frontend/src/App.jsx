import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function formatCurrency(value) {
  return `$${value.toFixed(2)}`
}

function getResourceMetrics(resource) {
  const metrics = resource.metrics || {}
  const type = resource.type || resource.resource_type
  if (type === 'EC2') return [`CPU ${metrics.cpu_utilization}%`, `Memory ${metrics.memory_utilization}%`]
  if (type === 'RDS') return [`CPU ${metrics.cpu_utilization}%`, `${metrics.connections} connections`]
  if (type === 'EBS') return [`${metrics.size_gb} GB`, metrics.attached ? 'Attached' : 'Unattached']
  if (type === 'S3') return [`${metrics.storage_gb} GB`, `${metrics.last_activity_days}d inactive`]
  return []
}

function getPrimaryMetric(resource) {
  const [primary] = getResourceMetrics(resource)
  return primary || 'No utilization metric'
}

function getResourceType(resource) {
  return resource.type || resource.resource_type
}

function getResourceCost(resource) {
  return resource.monthly_cost ?? 0
}

function getResourceSavings(resource) {
  return resource.potential_savings ?? resource.estimated_monthly_savings ?? 0
}

function getResourceCarbon(resource) {
  return resource.estimated_carbon_impact ?? resource.estimated_co2_impact ?? 0
}

function getWasteBreakdown(resources) {
  const highWaste = resources.filter((resource) => resource.analysis_status === 'High Waste').length
  const underutilized = resources.filter((resource) => resource.analysis_status === 'Underutilized').length
  const optimizationCandidates = resources.filter((resource) => resource.analysis_status === 'Optimization Candidate').length
  const total = highWaste + underutilized + optimizationCandidates
  const idlePercent = total ? Math.round((highWaste / total) * 100) : 0
  const underutilizedPercent = total ? Math.round((underutilized / total) * 100) : 0
  const optimizationPercent = total ? 100 - idlePercent - underutilizedPercent : 0

  return [
    { label: 'Idle compute', value: idlePercent, color: 'teal', amount: `${idlePercent}%` },
    { label: 'Underutilized compute', value: underutilizedPercent, color: 'amber', amount: `${underutilizedPercent}%` },
    { label: 'Optimization candidates', value: optimizationPercent, color: 'slate', amount: `${optimizationPercent}%` },
  ]
}

function Icon({ children, className = '' }) {
  return <span className={`icon ${className}`} aria-hidden="true">{children}</span>
}

function Sidebar({ summary, onNavigate, currentPath }) {
  const goTo = (event, path) => {
    event.preventDefault()
    onNavigate(path)
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><span></span><span></span><span></span></div>
        <div><strong>EcoCloud</strong><span>Sentinel</span></div>
      </div>
      <div className="nav-label">Workspace</div>
      <nav className="primary-nav" aria-label="Primary navigation">
        <a className={`nav-item ${currentPath === '/' ? 'active' : ''}`} href="/" onClick={(event) => goTo(event, '/')}><Icon>⌂</Icon>Overview</a>
        <a className={`nav-item ${currentPath.startsWith('/resources') ? 'active' : ''}`} href="/resources" onClick={(event) => goTo(event, '/resources')}><Icon>▦</Icon>Resources <span className="nav-count">{summary.resources_scanned}</span></a>
        <a className={`nav-item ${currentPath.startsWith('/findings') ? 'active' : ''}`} href="/findings" onClick={(event) => goTo(event, '/findings')}><Icon>◈</Icon>Waste Findings <span className="nav-count warning-count">{summary.wasteful_resources}</span></a>
        <a className={`nav-item ${currentPath.startsWith('/recommendations') ? 'active' : ''}`} href="/recommendations" onClick={(event) => goTo(event, '/recommendations')}><Icon>↗</Icon>Recommendations</a>
      </nav>
      <div className="sidebar-foot">
        <div className="nav-label">Environment</div>
        <div className="environment-switcher">
          <div className="aws-badge">aws</div>
          <div><span>AWS Environment</span><strong>Demo Environment</strong></div>
          <span className="chevron">⌄</span>
        </div>
        <div className="demo-note"><span></span> Demo data only</div>
      </div>
    </aside>
  )
}

function MetricCard({ metric }) {
  return (
    <article className={`metric-card ${metric.tone}`}>
      <div className="metric-heading"><span>{metric.label}</span><Icon className="metric-icon">{metric.icon}</Icon></div>
      <strong className="metric-value">{metric.value}</strong>
      <div className="metric-note"><span className="note-dot"></span>{metric.note}</div>
    </article>
  )
}

function StatusPill({ status }) {
  const statusClass = status.toLowerCase().replace(' ', '-')
  return <span className={`status-pill ${statusClass}`}><span></span>{status}</span>
}

function ResourceTable({ resources, onNavigate, showViewAll = true }) {
  return (
    <section className="panel resource-panel" id="resources">
      <div className="panel-header table-header">
        <div><p className="eyebrow">Local inventory preview</p><h2>Infrastructure Resources</h2></div>
        {showViewAll && <a className="text-button" href="/resources">View all <span>→</span></a>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Resource</th><th>Type</th><th>Region</th><th>Key metrics</th><th>Monthly Cost</th><th>Status</th><th aria-label="Action"></th></tr></thead>
          <tbody>
            {resources.map((resource) => {
              const status = resource.analysis_status
              return (
                <tr key={resource.resource_id}>
                  <td><a className="resource-link" href={`/resources/${resource.resource_id}`}><span className="resource-icon">▣</span><div><strong>{resource.name}</strong><small>{resource.resource_id}</small></div></a></td>
                  <td><span className="type-label">{getResourceType(resource)}</span></td>
                  <td className="region">{resource.region}</td>
                  <td>{resource.metrics?.cpu_utilization != null ? <div className="utilization"><span className="util-bar"><i style={{ width: `${Math.max(resource.metrics.cpu_utilization * 2, 5)}%` }}></i></span><strong>{getResourceMetrics(resource).join(' · ')}</strong></div> : <span className="resource-metric-text">{getResourceMetrics(resource).join(' · ')}</span>}</td>
                  <td className="cost">{formatCurrency(getResourceCost(resource))}</td>
                  <td><StatusPill status={status} /></td>
                  <td><a className="review-button" href={`/resources/${resource.resource_id}`}>Review <span>↗</span></a></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="table-foot"><span className="live-dot"></span> Showing local sample data <span className="foot-divider">|</span> Last analyzed just now</div>
    </section>
  )
}

function WasteBreakdown({ resources }) {
  const wasteBreakdown = getWasteBreakdown(resources)
  const idlePercent = wasteBreakdown[0].value
  const underutilizedPercent = idlePercent + wasteBreakdown[1].value

  return (
    <section className="panel waste-panel" id="findings">
      <div className="panel-header"><div><p className="eyebrow">Resource efficiency</p><h2>Waste Breakdown</h2></div><a className="text-button" href="/findings">View all <span>→</span></a></div>
      <div className="waste-content">
        <div className="donut" style={{ background: `conic-gradient(var(--teal) 0 ${idlePercent}%, var(--amber) ${idlePercent}% ${underutilizedPercent}%, #4f6875 ${underutilizedPercent}% 100%)` }} aria-label="Waste breakdown chart"><div><strong>{resources.filter((resource) => resource.analysis_status !== 'Healthy').length}</strong><span>findings</span></div></div>
        <div className="legend">{wasteBreakdown.map((item) => <div className="legend-row" key={item.label}><span className={`legend-swatch ${item.color}`}></span><span>{item.label}</span><strong>{item.amount}</strong></div>)}</div>
      </div>
      <div className="insight-line"><Icon>↗</Icon><span><strong>{resources.filter((resource) => resource.analysis_status !== 'Healthy').length} findings</strong> identified in the demo environment</span></div>
    </section>
  )
}

function Recommendations({ findings }) {
  const recommendations = findings.slice(0, 3).map((finding, index) => ({
    number: String(index + 1),
    resourceId: finding.resource_id,
    title: finding.recommendation,
    benefit: finding.estimated_monthly_savings > 0
      ? `Estimated saving ${formatCurrency(finding.estimated_monthly_savings)} / month`
      : 'No immediate savings estimate',
    accent: finding.analysis_status === 'High Waste' ? 'teal' : 'amber',
  }))

  return (
    <section className="panel recommendations-panel" id="recommendations">
      <div className="panel-header"><div><p className="eyebrow">Next best actions</p><h2>Recommended Actions</h2></div><span className="recommendation-score">{findings.length} Actions Identified</span></div>
      <div className="recommendation-list">{recommendations.map((recommendation) => <div className="recommendation" key={recommendation.number}><span className={`recommendation-number ${recommendation.accent}`}>{recommendation.number}</span><div><strong>{recommendation.title}</strong><span>{recommendation.benefit}</span></div><a className="recommendation-action" href={`/resources/${encodeURIComponent(recommendation.resourceId)}`} aria-label={`Review ${recommendation.title}`}>→</a></div>)}</div>
    </section>
  )
}

function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/recommendations`)
        if (!response.ok) {
          throw new Error('The recommendations API returned an error.')
        }
        const data = await response.json()
        setRecommendations(data.recommendations)
      } catch (fetchError) {
        setError(fetchError.message)
      }
    }

    loadRecommendations()
  }, [])

  if (error) return <ErrorState message={error} />
  if (!recommendations) return <LoadingState />

  return (
    <>
      <section className="page-intro resource-page-intro"><div><div className="title-kicker"><span className="kicker-line"></span> NEXT BEST ACTIONS</div><h1>Recommended <span>Actions</span></h1><p>Prioritized actions generated by the local analysis engine.</p></div><div className="monitoring-status"><span></span> {recommendations.length} actions identified</div></section>
      <Recommendations findings={recommendations} />
    </>
  )
}

function ResourcesPage({ resources, summary, onNavigate }) {
  return (
    <>
      <section className="page-intro resource-page-intro"><div><div className="title-kicker"><span className="kicker-line"></span> LOCAL RESOURCE INVENTORY</div><h1>Infrastructure <span>Resources</span></h1><p>Review analyzed resources and their current sustainability status.</p></div><div className="monitoring-status"><span></span> {summary.resources_scanned} resources analyzed</div></section>
      <div className="resource-page-summary"><span><strong>{summary.resources_scanned}</strong> total resources</span><span><strong>{summary.wasteful_resources}</strong> need review</span><span><strong>{formatCurrency(summary.potential_monthly_savings)}</strong> estimated savings</span></div>
      <ResourceTable resources={resources} onNavigate={onNavigate} showViewAll={false} />
    </>
  )
}

function FindingsPage({ findings, summary }) {
  const filters = ['All', 'High Waste', 'Underutilized']
  const requestedFilter = new URLSearchParams(window.location.search).get('filter')
  const filter = filters.includes(requestedFilter) ? requestedFilter : 'All'
  const filteredFindings = filter === 'All'
    ? findings
    : findings.filter((finding) => finding.analysis_status === filter)

  return (
    <>
      <section className="page-intro resource-page-intro"><div><div className="title-kicker"><span className="kicker-line"></span> WASTE DETECTION</div><h1>Waste <span>Findings</span></h1><p>Prioritized opportunities generated by the local analysis engine.</p></div><div className="monitoring-status"><span></span> {summary.wasteful_resources} findings identified</div></section>
      <div className="finding-filter-bar"><div><strong>{filteredFindings.length}</strong> of {findings.length} findings</div><div className="finding-filters" role="group" aria-label="Filter findings">{filters.map((item) => <a className={filter === item ? 'active' : ''} href={item === 'All' ? '/findings' : `/findings?filter=${encodeURIComponent(item)}`} key={item}>{item}</a>)}</div></div>
      {filteredFindings.length === 0 ? <div className="data-state inline-state"><strong>No findings in this filter</strong><span>Try another waste classification.</span></div> : <div className="finding-list">{filteredFindings.map((finding) => <a className="finding-list-item" href={`/findings/${finding.resource_id}`} key={finding.resource_id}><div className="finding-list-top"><div><span className="finding-list-icon">◈</span><div><strong>{finding.name}</strong><small>{finding.resource_id} <b>•</b> {finding.resource_type} <b>•</b> {finding.region}</small></div></div><StatusPill status={finding.analysis_status} /></div><div className="finding-list-metrics"><div><span>Monthly cost</span><strong>{formatCurrency(finding.monthly_cost)}</strong></div><div><span>Potential savings</span><strong className="savings-value">{formatCurrency(finding.estimated_monthly_savings)}</strong></div><div><span>CO₂ impact</span><strong>{finding.estimated_co2_impact} kg/mo</strong></div></div><p>{finding.analysis_explanation}</p><div className="finding-recommendation"><span>Recommendation</span><strong>{finding.recommendation}</strong><span className="finding-arrow">→</span></div></a>)}</div>}
    </>
  )
}

function FindingDetails({ findingId }) {
  const [finding, setFinding] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadFinding() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/findings/${encodeURIComponent(findingId)}`)
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Finding not found.' : 'The findings API returned an error.')
        }
        setFinding(await response.json())
      } catch (fetchError) {
        setError(fetchError.message)
      }
    }

    loadFinding()
  }, [findingId])

  if (error) return <div className="detail-state"><a className="back-link" href="/findings">← Back to findings</a><ErrorState message={error} /></div>
  if (!finding) return <LoadingState />

  return (
    <>
      <a className="back-link" href="/findings">← Back to findings</a>
      <section className="detail-heading"><div><div className="title-kicker"><span className="kicker-line"></span> FINDING DETAIL</div><h1>{finding.name}</h1><p>{getResourceType(finding)} <b>•</b> {finding.region} <b>•</b> {finding.resource_id}</p></div><StatusPill status={finding.analysis_status} /></section>
      <section className="detail-grid finding-detail-grid">
        <article className="panel detail-card primary-detail"><div className="panel-header"><div><p className="eyebrow">Resource identity</p><h2>Finding overview</h2></div><span className="finding-list-icon large">◈</span></div><div className="detail-fields"><div><span>Resource ID</span><strong>{finding.resource_id}</strong></div><div><span>Resource type</span><strong>{getResourceType(finding)}</strong></div><div><span>Current status</span><strong>{finding.runtime_status}</strong></div><div><span>Region</span><strong>{finding.region}</strong></div></div></article>
        <ResourceMetricsCard resource={finding} />
        <article className="panel detail-card"><div className="panel-header"><div><p className="eyebrow">Financial impact</p><h2>Estimated opportunity</h2></div></div><div className="detail-metric"><strong>{formatCurrency(getResourceCost(finding))}</strong><span>Estimated monthly cost</span><div className="detail-cost-row"><span>Potential savings</span><b>{formatCurrency(getResourceSavings(finding))}</b></div></div></article>
      </section>
      <section className="panel analysis-card"><div className="panel-header"><div><p className="eyebrow">Finding evidence</p><h2>Why EcoCloud Sentinel flagged this</h2></div><span className="analysis-badge">LOCAL ENGINE</span></div><div className="analysis-copy"><p>{finding.analysis_explanation}</p><div className="analysis-columns"><div><span>Waste severity</span><StatusPill status={finding.analysis_status} /></div><div><span>Estimated CO₂ impact</span><strong>{finding.estimated_co2_impact} kg/mo</strong><small>Demo estimate, not an official AWS calculation</small></div><div><span>Recommended action</span><strong>{finding.recommendation}</strong></div></div></div></section>
    </>
  )
}

function ResourceMetricsCard({ resource }) {
  return (
    <article className="panel detail-card"><div className="panel-header"><div><p className="eyebrow">Resource metrics</p><h2>{getResourceType(resource)} signals</h2></div></div><div className="detail-metric metric-stack">{getResourceMetrics(resource).map((metric) => <strong key={metric}>{metric}</strong>)}</div></article>
  )
}

function ResourceDetails({ resourceId, onNavigate }) {
  const [resource, setResource] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadResource() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/resources/${encodeURIComponent(resourceId)}`)
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Resource not found.' : 'The resource API returned an error.')
        }
        setResource(await response.json())
      } catch (fetchError) {
        setError(fetchError.message)
      }
    }

    loadResource()
  }, [resourceId])

  if (error) return <div className="detail-state"><a className="back-link" href="/resources">← Back to resources</a><ErrorState message={error} /></div>
  if (!resource) return <LoadingState />

  return (
    <>
      <a className="back-link" href="/resources">← Back to resources</a>
      <section className="detail-heading"><div><div className="title-kicker"><span className="kicker-line"></span> RESOURCE DETAIL</div><h1>{resource.name}</h1><p>{getResourceType(resource)} <b>•</b> {resource.region} <b>•</b> {resource.resource_id}</p></div><StatusPill status={resource.analysis_status} /></section>
      <section className="detail-grid">
        <article className="panel detail-card primary-detail"><div className="panel-header"><div><p className="eyebrow">Analyzed resource</p><h2>Resource overview</h2></div><span className="resource-icon large">▣</span></div><div className="detail-fields"><div><span>Resource ID</span><strong>{resource.resource_id}</strong></div><div><span>Resource type</span><strong>{getResourceType(resource)}</strong></div><div><span>Region</span><strong>{resource.region}</strong></div><div><span>Runtime status</span><strong>{resource.runtime_status}</strong></div></div></article>
        <ResourceMetricsCard resource={resource} />
        <article className="panel detail-card"><div className="panel-header"><div><p className="eyebrow">Cost estimate</p><h2>Monthly impact</h2></div></div><div className="detail-metric"><strong>{formatCurrency(getResourceCost(resource))}</strong><span>Estimated monthly cost</span><div className="detail-cost-row"><span>Potential savings</span><b>{formatCurrency(getResourceSavings(resource))}</b></div></div></article>
      </section>
      <section className="panel analysis-card"><div className="panel-header"><div><p className="eyebrow">Analysis explanation</p><h2>Why this resource was classified</h2></div><span className="analysis-badge">LOCAL ENGINE</span></div><div className="analysis-copy"><p>{resource.analysis_explanation}</p><div className="analysis-columns"><div><span>Waste classification</span><StatusPill status={resource.analysis_status} /></div><div><span>Estimated CO₂ impact</span><strong>{resource.estimated_co2_impact} kg/mo</strong><small>Demo estimate, not an official AWS calculation</small></div><div><span>Recommendation</span><strong>{resource.recommendation}</strong></div></div></div></section>
    </>
  )
}

function LoadingState() {
  return <div className="data-state"><span className="loading-spinner"></span><strong>Loading local analysis</strong><span>Connecting to the FastAPI demo engine...</span></div>
}

function ErrorState({ message }) {
  return <div className="data-state error-state"><strong>Analysis unavailable</strong><span>{message}</span><small>Start the backend with <code>uvicorn main:app --reload</code>.</small></div>
}

function App() {
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState('')
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  function navigate(path) {
    const [pathname, hash] = path.split('#')
    window.history.pushState({}, '', pathname + (hash ? `#${hash}` : ''))
    setCurrentPath(pathname)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const responses = await Promise.all([
          fetch(`${API_BASE_URL}/api/resources`),
          fetch(`${API_BASE_URL}/api/summary`),
          fetch(`${API_BASE_URL}/api/findings`),
        ])

        if (responses.some((response) => !response.ok)) {
          throw new Error('The analysis API returned an error.')
        }

        const [resourcesResponse, summaryResponse, findingsResponse] = await Promise.all(
          responses.map((response) => response.json()),
        )
        setDashboardData({
          resources: resourcesResponse.resources,
          summary: summaryResponse,
          findings: findingsResponse.findings,
        })
      } catch (fetchError) {
        setError(fetchError.message)
      }
    }

    loadDashboardData()
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (error) return <ErrorState message={error} />
  if (!dashboardData) return <LoadingState />

  const { resources, summary, findings } = dashboardData
  const priorityFinding = findings[0] || resources[0]
  const priorityCpu = priorityFinding.metrics?.cpu_utilization
  const metrics = [
    { label: 'Resources Scanned', value: String(summary.resources_scanned), note: 'Across demo environment', icon: '⌁', tone: 'neutral' },
    { label: 'Resources Requiring Review', value: String(summary.wasteful_resources), note: 'Needs review', icon: '!', tone: 'warning' },
    { label: 'Potential Monthly Savings', value: formatCurrency(summary.potential_monthly_savings), note: 'Estimated opportunity', icon: '$', tone: 'positive' },
    { label: 'Estimated CO₂ Impact', value: `${summary.estimated_co2_impact} kg/mo`, note: 'Demo estimate only', icon: '◒', tone: 'positive' },
  ]

  return (
    <div className="app-shell">
      <Sidebar summary={summary} onNavigate={navigate} currentPath={currentPath} />
      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><span></span><span></span><span></span></div><strong>EcoCloud <em>Sentinel</em></strong></div>
          <div className="breadcrumbs"><a href="/" onClick={(event) => { event.preventDefault(); navigate('/') }}>Workspace</a><b>/</b><strong>{currentPath.startsWith('/resources') ? 'Resources' : currentPath.startsWith('/findings') ? 'Waste Findings' : currentPath.startsWith('/recommendations') ? 'Recommendations' : 'Overview'}</strong></div>
          <div className="topbar-actions"><span className="last-sync">Last sync: just now</span><button className="icon-button" type="button" aria-label="Notifications">♧<i></i></button><div className="avatar">JD</div></div>
        </header>
        <div className="content-wrap">
          {currentPath.startsWith('/resources/') ? <ResourceDetails resourceId={decodeURIComponent(currentPath.split('/')[2])} onNavigate={navigate} /> : currentPath === '/resources' ? <ResourcesPage resources={resources} summary={summary} onNavigate={navigate} /> : currentPath.startsWith('/findings/') ? <FindingDetails findingId={decodeURIComponent(currentPath.split('/')[2])} /> : currentPath === '/findings' ? <FindingsPage findings={findings} summary={summary} /> : currentPath === '/recommendations' ? <RecommendationsPage /> : <>
          <section className="page-intro"><div><div className="title-kicker"><span className="kicker-line"></span> SUSTAINABILITY CONTROL PLANE</div><h1>Cloud Sustainability <span>Overview</span></h1><p>Identify infrastructure waste before it becomes unnecessary cost.</p></div><div className="monitoring-status"><span></span> Monitoring</div></section>
          <section className="metrics-grid" aria-label="Summary metrics">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>
          <section className="finding-card" aria-labelledby="priority-heading">
            <div className="finding-accent"></div>
            <div className="finding-main"><div className="finding-label"><span className="pulse-dot"></span><span id="priority-heading">Priority Finding</span><span className="finding-id">LOCAL-{priorityFinding.resource_id.slice(-4)}</span></div><div className="finding-resource"><div className="server-mark">⌁</div><div><h2>{priorityFinding.name}</h2><span>{getResourceType(priorityFinding)} <b>•</b> {priorityFinding.region}</span></div></div><div className="finding-explanation"><span className="quote-mark">“</span><p>{priorityFinding.analysis_explanation}</p></div></div>
            <div className="finding-stats"><div><span>{priorityCpu == null ? 'Key metric' : 'CPU utilization'}</span><strong className="critical-value">{priorityCpu == null ? getPrimaryMetric(priorityFinding) : <>{priorityCpu}<small>%</small></>}</strong>{priorityCpu != null && <div className="mini-bar"><i style={{ width: `${Math.max(priorityCpu * 2, 5)}%` }}></i></div>}</div><div><span>Monthly cost</span><strong>{formatCurrency(getResourceCost(priorityFinding))}</strong><small className="sub-stat">per month</small></div><div><span>Status</span><StatusPill status={priorityFinding.analysis_status} /></div></div>
            <div className="finding-action"><span className="recommend-label">Recommended action</span><p>{priorityFinding.recommendation}</p><button className="review-primary" type="button">Review Resource <span>↗</span></button></div>
          </section>
          <div className="section-grid"><WasteBreakdown resources={resources} /><Recommendations findings={findings} /></div>
          <ResourceTable resources={resources} onNavigate={navigate} />
          <footer className="page-footer"><span><span className="footer-mark">◒</span> EcoCloud Sentinel</span><span>Demo workspace <b>•</b> No AWS connection</span></footer>
          </>}
        </div>
      </main>
    </div>
  )
}

export default App
