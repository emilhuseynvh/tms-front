import { useState, useRef } from 'react'
import { useGetUsersQuery, useUploadImageMutation } from '../services/adminApi'
import {
  useUpdateGroupChatMutation,
  useAddMemberToGroupMutation,
  useRemoveMemberFromGroupMutation,
} from '../services/chatApi'
import { toast } from 'react-toastify'
import { useConfirm } from '../context/ConfirmContext'

const GroupChatSettingsModal = ({ room, currentUser, onClose, onUpdated }) => {
  const { confirm } = useConfirm()
  const { data: users = [] } = useGetUsersQuery()
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation()
  const [updateGroupChat, { isLoading: isUpdating }] = useUpdateGroupChatMutation()
  const [addMemberToGroup, { isLoading: isAdding }] = useAddMemberToGroupMutation()
  const [removeMemberFromGroup] = useRemoveMemberFromGroupMutation()

  const [groupName, setGroupName] = useState(room.name || '')
  const [addUserId, setAddUserId] = useState('')
  const fileInputRef = useRef(null)

  const isCurrentUserAdmin = !!room.members?.find(
    (m) => m.userId === currentUser?.id && m.isAdmin
  )

  const memberUserIds = room.members?.map((m) => m.userId) || []
  const addableUsers = users.filter((u) => !memberUserIds.includes(u.id))

  const refreshRoom = (updatedRoom) => {
    if (updatedRoom && onUpdated) onUpdated(updatedRoom)
  }

  const handleSaveName = async () => {
    if (!groupName.trim() || groupName.trim() === room.name) return
    try {
      const updated = await updateGroupChat({ roomId: room.id, name: groupName.trim() }).unwrap()
      refreshRoom(updated)
      toast.success('Qrup adı yeniləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi')
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Yalnız JPG, PNG və WebP formatları dəstəklənir!')
      e.target.value = ''
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadImage(formData).unwrap()
      const updated = await updateGroupChat({ roomId: room.id, avatarId: result.id }).unwrap()
      refreshRoom(updated)
      toast.success('Qrup şəkli yeniləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Şəkil yüklənərkən xəta baş verdi!')
    } finally {
      e.target.value = ''
    }
  }

  const handleAddMember = async () => {
    if (!addUserId) return
    try {
      const updated = await addMemberToGroup({ roomId: room.id, userIds: [Number(addUserId)] }).unwrap()
      refreshRoom(updated)
      setAddUserId('')
      toast.success('Üzv əlavə edildi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi')
    }
  }

  const handleRemoveMember = async (userId, username) => {
    const confirmed = await confirm({
      title: 'Üzvü qrupdan çıxar',
      message: `"${username}" qrupdan çıxarılacaq. Əminsiniz?`,
      confirmText: 'Çıxar',
      cancelText: 'Ləğv et',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      const updated = await removeMemberFromGroup({ roomId: room.id, userId }).unwrap()
      refreshRoom(updated)
      toast.success(`${username} qrupdan çıxarıldı`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-scaleIn">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Qrup parametrləri</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Group avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {room.avatar?.url ? (
              <img src={room.avatar.url} alt={room.name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
                {room.name?.charAt(0).toUpperCase() || 'Q'}
              </div>
            )}
            {isCurrentUserAdmin && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-gray-300 rounded-full shadow hover:bg-gray-50 transition-colors"
                title="Qrup şəklini dəyiş"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          {isUploading && <p className="mt-2 text-xs text-gray-500">Yüklənir...</p>}
        </div>

        {/* Group name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Qrup adı</label>
          {isCurrentUserAdmin ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleSaveName}
                disabled={isUpdating || !groupName.trim() || groupName.trim() === room.name}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Saxla
              </button>
            </div>
          ) : (
            <p className="px-4 py-2 bg-gray-50 rounded-md text-sm text-gray-800">{room.name}</p>
          )}
        </div>

        {/* Add member (admins only) */}
        {isCurrentUserAdmin && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Üzv əlavə et</label>
            <div className="flex gap-2">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">İstifadəçi seçin...</option>
                {addableUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addUserId || isAdding}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Əlavə et
              </button>
            </div>
          </div>
        )}

        {/* Members list */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Üzvlər ({room.members?.length || 0})
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {(room.members || []).map((member) => (
              <div key={member.id} className="p-3 border-b border-gray-100 last:border-b-0 flex items-center gap-3">
                {member.user?.avatar?.url ? (
                  <img src={member.user.avatar.url} alt={member.user?.username} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {member.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.user?.username}
                    {member.userId === currentUser?.id && <span className="text-gray-400"> (siz)</span>}
                  </p>
                </div>
                {member.isAdmin && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full shrink-0">
                    Admin
                  </span>
                )}
                {isCurrentUserAdmin && member.userId !== currentUser?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user?.username)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                    title="Qrupdan çıxar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupChatSettingsModal
