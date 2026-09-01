/** Qovluq yalnız assignee, sahibi, admin və ya qovluqdakı siyahıya/tapşırığa təyin olunan userə görünür. */
export function userCanSeeFolder(folder, user) {
  if (!folder) return false
  if (!user) return false
  if (user.role === 'admin') return true
  if (folder.ownerId === user.id || folder.owner?.id === user.id) return true
  if (folder.assignees?.some((a) => a.id === user.id)) return true
  if (folder.taskLists?.some((list) =>
    list.assignees?.some((a) => a.id === user.id) || list.createdById === user.id
  )) return true
  if (folder.taskLists?.some((list) =>
    list.tasks?.some((task) => task.assignees?.some((a) => a.id === user.id))
  )) return true
  return false
}

export function visibleFoldersForUser(folders, user) {
  const list = folders || []
  if (!user) return list
  if (user.role === 'admin') return list
  return list.filter((folder) => userCanSeeFolder(folder, user))
}
