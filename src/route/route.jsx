import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router";
import AppLayout from "../layout/AppLayout";
import Translation from "../pages/Translation";
import Login from "../pages/Login";
import Projects from "../pages/Projects";
import Profile from "../pages/Profile";
import Users from "../pages/Users";
import Tasks from "../pages/Tasks";
import TaskLists from "../pages/TaskLists";
import TaskDetail from "../pages/TaskDetail";
import TaskStatuses from "../pages/TaskStatuses";
import ActivityLogs from "../pages/ActivityLogs";
import Trash from "../pages/Trash";
import Settings from "../pages/Settings";
import Protected from "./Protected";
import AdminProtected from "./AdminProtected";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/* Auth routes without main layout (no sidebar/topbar) */}
            <Route path="/login" element={<Login />} />

            {/* App routes with layout */}
            <Route path="/" element={<Protected><AppLayout /></Protected>}>
                <Route path="/" element={<Navigate to="/projects" replace />} />
                <Route path="/users" element={<AdminProtected><Users /></AdminProtected>} />
                <Route path="/statuses" element={<AdminProtected><TaskStatuses /></AdminProtected>} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/tasks" element={<Tasks />} />
                {/* Space routes */}
                <Route path="/tasks/space/:spaceId" element={<TaskLists />} />
                <Route path="/tasks/space/:spaceId/folder/:folderId" element={<TaskLists />} />
                <Route path="/tasks/space/:spaceId/list/:taskListId" element={<TaskDetail />} />
                <Route path="/tasks/space/:spaceId/folder/:folderId/list/:taskListId" element={<TaskDetail />} />
                {/* Legacy folder routes - for backwards compatibility */}
                <Route path="/tasks/folder/:folderId" element={<TaskLists />} />
                <Route path="/tasks/folder/:folderId/list/:taskListId" element={<TaskDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/translation" element={<Translation />} />
                <Route path="/settings" element={<AdminProtected><Settings /></AdminProtected>} />
            </Route>
        </>
    )
)