import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import MyLayout from './components/MyLayout.jsx';
import MyPage from './pages/MyPage.jsx';
import MyEditPage from './pages/MyEditPage.jsx';
import MyAccountPage from './pages/MyAccountPage.jsx';
import WritePage from './pages/WritePage.jsx';
import GaragePage from './pages/GaragePage.jsx';
import BikeFormPage from './pages/BikeFormPage.jsx';
import BikeDetailPage from './pages/BikeDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:board" element={<CommunityPage />} />
        <Route path="/community/post/:id" element={<PostDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/community/write" element={<WritePage />} />
          <Route path="/garage" element={<GaragePage />} />
          <Route path="/garage/new" element={<BikeFormPage />} />
          <Route path="/garage/:id" element={<BikeDetailPage />} />
          <Route path="/garage/:id/edit" element={<BikeFormPage />} />
          <Route path="/my" element={<MyLayout />}>
            <Route index element={<MyPage />} />
            <Route path="edit" element={<MyEditPage />} />
            <Route path="account" element={<MyAccountPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
