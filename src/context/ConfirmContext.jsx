import { createContext, useContext, useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

const ConfirmContext = createContext(null)

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Təsdiq et',
    cancelText: 'Ləğv et',
    type: 'danger',
    loading: false,
    onConfirm: () => {},
    onCancel: () => {}
  })

  const confirm = useCallback(({
    title = 'Təsdiq',
    message = 'Bu əməliyyatı həyata keçirmək istədiyinizdən əminsiniz?',
    confirmText = 'Təsdiq et',
    cancelText = 'Ləğv et',
    type = 'danger'
  } = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        loading: false,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        }
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    modalState.onCancel()
  }, [modalState])

  const handleConfirm = useCallback(() => {
    modalState.onConfirm()
  }, [modalState])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
        loading={modalState.loading}
      />
    </ConfirmContext.Provider>
  )
}
