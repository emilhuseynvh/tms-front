import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router";
import AppLayout from "../layout/AppLayout";
import Translation from "../pages/Translation";
import Login from "../pages/Login";
import Projects from "../pages/Projects";
import Profile from "../pages/Profile";
import Users from "../pages/Users";
import Tasks from "../pages/Tasks";
import InfluenserAzPage from "../pages/InfluenserAzPage";
import TaskLists from "../pages/TaskLists";
import TaskDetail from "../pages/TaskDetail";
import MeetingNote from "../pages/MeetingNote";
import TaskStatuses from "../pages/TaskStatuses";
import ActivityLogs from "../pages/ActivityLogs";
import Trash from "../pages/Trash";
import Notifications from "../pages/Notifications";
import Home from "../pages/Home";
import Archive from "../pages/Archive";
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
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/users" element={<AdminProtected><Users /></AdminProtected>} />
                <Route path="/statuses" element={<AdminProtected><TaskStatuses /></AdminProtected>} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/influenser-az" element={<InfluenserAzPage />} />
                {/* Space routes */}
                <Route path="/tasks/space/:spaceId" element={<TaskLists />} />
                <Route path="/tasks/space/:spaceId/folder/:folderId" element={<TaskLists />} />
                <Route path="/tasks/space/:spaceId/list/:taskListId" element={<TaskDetail />} />
                <Route path="/tasks/space/:spaceId/folder/:folderId/list/:taskListId" element={<TaskDetail />} />
                <Route path="/tasks/space/:spaceId/note/:taskListId" element={<MeetingNote />} />
                <Route path="/tasks/space/:spaceId/folder/:folderId/note/:taskListId" element={<MeetingNote />} />
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