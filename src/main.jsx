import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './route/route'
import { Provider } from 'react-redux'
import { store } from './services/store'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <>
            <RouterProvider router={router} />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar style={{ zIndex: 99999 }} />
        </>
    </Provider>
)
