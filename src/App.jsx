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
import ExplorePage from './pages/ExplorePage.jsx';
import MarketPage from './pages/MarketPage.jsx';
import ListingDetailPage from './pages/ListingDetailPage.jsx';
import ListingFormPage from './pages/ListingFormPage.jsx';
import PlacePage from './pages/PlacePage.jsx';
import PlaceDetailPage from './pages/PlaceDetailPage.jsx';
import PlaceFormPage from './pages/PlaceFormPage.jsx';
import GoodsPage from './pages/GoodsPage.jsx';
import GoodsDetailPage from './pages/GoodsDetailPage.jsx';
import GoodsFormPage from './pages/GoodsFormPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:board" element={<CommunityPage />} />
        <Route path="/community/post/:id" element={<PostDetailPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/market/:id" element={<ListingDetailPage />} />
        <Route path="/place" element={<PlacePage />} />
        <Route path="/place/:id" element={<PlaceDetailPage />} />
        <Route path="/goods" element={<GoodsPage />} />
        <Route path="/goods/:id" element={<GoodsDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/community/write" element={<WritePage />} />
          <Route path="/market/new" element={<ListingFormPage />} />
          <Route path="/market/:id/edit" element={<ListingFormPage />} />
          <Route path="/place/new" element={<PlaceFormPage />} />
          <Route path="/place/:id/edit" element={<PlaceFormPage />} />
          <Route path="/goods/new" element={<GoodsFormPage />} />
          <Route path="/goods/:id/edit" element={<GoodsFormPage />} />
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
