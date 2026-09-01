/**
 * Tapşırıq assignee dairəsi:
 * - yaradan hələ təyindedirsə: mavi
 * - yaradan çıxıbsa və orijinal 2-ci şəxs qalıbsa: tünd boz
 * - əks halda: açıq boz (3-cü şəxs heç vaxt irəli çəkilmir)
 */
export function getAssigneeBadgeTone(task, assigneeId) {
  const creatorId = task?.createdById ?? null
  const secondId = task?.secondAssigneeId ?? null
  const ids = (task?.assignees || []).map((a) => a.id)
  const creatorOnTask = creatorId != null && ids.includes(creatorId)

  if (creatorOnTask && assigneeId === creatorId) return 'creator'
  if (
    !creatorOnTask &&
    secondId != null &&
    assigneeId === secondId &&
    ids.includes(secondId)
  ) {
    return 'successor'
  }
  return 'member'
}

export function assigneeBadgeClassName(task, assigneeId) {
  const tone = getAssigneeBadgeTone(task, assigneeId)
  if (tone === 'creator') return 'bg-blue-600 text-white'
  if (tone === 'successor') return 'bg-gray-600 text-white'
  return 'bg-gray-200 text-gray-600'
}

export function assigneeBadgeTitle(task, assignee) {
  const tone = getAssigneeBadgeTone(task, assignee.id)
  if (tone === 'creator') return `${assignee.username} (yaradan)`
  if (tone === 'successor') return `${assignee.username} (ikinci təyin)`
  return assignee.username
}
