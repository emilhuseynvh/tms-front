import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router";
import AppLayout from "../layout/AppLayout";
import Translation from "../pages/Translation";
import Login from "../pages/Login";
import Projects from "../pages/Projects";
import Chat from "../pages/Chat";
import Profile from "../pages/Profile";
import Users from "../pages/Users";
import Tasks from "../pages/Tasks";
import TaskLists from "../pages/TaskLists";
import TaskDetail from "../pages/TaskDetail";
import Protected from "./Protected";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/* Auth routes without main layout (no sidebar/topbar) */}
            <Route path="/login" element={<Login />} />

            {/* App routes with layout */}
            <Route path="/" element={<Protected><AppLayout /></Protected>}>
                <Route path="/" element={<Navigate to="/users" replace />} />
                <Route path="/users" element={<Users />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/folder/:folderId" element={<TaskLists />} />
                <Route path="/tasks/folder/:folderId/list/:taskListId" element={<TaskDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/translation" element={<Translation />} />
            </Route>
        </>
    )
)