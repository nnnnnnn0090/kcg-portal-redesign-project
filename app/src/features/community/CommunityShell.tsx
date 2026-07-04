import { useMemo } from 'react';
import { ALL_TAG } from './constants';
import { collectTags, filterPosts } from './utils';
import { Busy } from './components/FormUi';
import { Glyph } from './components/Glyph';
import { MobileNav, Sidebar } from './components/Navigation';
import { ModalLayer } from './dialogs/ModalLayer';
import { ExploreScreen } from './screens/ExploreScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { useCommunityActions, useCommunityState } from './state/CommunityProvider';

export function CommunityShell() {
  const state = useCommunityState();
  const actions = useCommunityActions();
  const {
    ja,
    defaultAuthorName,
    page,
    modal,
    posts,
    followingPosts,
    knownTags,
    searchUsers,
    notifications,
    unreadCount,
    profileUser,
    profilePosts,
    user,
    token,
    query,
    tag,
    loading,
    refreshing,
    busy,
    error,
    postImages,
    avatarImage,
    headerImage,
    closing,
  } = state;
  const {
    closeDrawer,
    loadFeed,
    go,
    openProfile,
    openTag,
    openConnections,
    authenticate,
    logout,
    submitPost,
    saveProfile,
    removePost,
    toggleLike,
    toggleFollow,
    refreshCurrentPage,
    openLikes,
    openProfileEditor,
    closeModal,
    setAuthMode,
    setModal,
    setQuery,
    setTag,
    setPostImages,
    readPostFiles,
    readAvatar,
    readHeader,
    canDeletePost,
  } = actions;
  const locale = ja ? 'ja' : 'en';
  const visiblePosts = useMemo(() => filterPosts(posts, query, tag), [posts, query, tag]);
  const visibleFollowingPosts = useMemo(
    () => filterPosts(followingPosts, query, tag),
    [followingPosts, query, tag],
  );
  const tags = useMemo(() => collectTags(posts, knownTags, locale), [knownTags, locale, posts]);
  const followingTags = useMemo(
    () => collectTags(followingPosts, [], locale),
    [followingPosts, locale],
  );

  const pageTitle =
    page === 'home'
      ? ja
        ? 'ホーム'
        : 'Home'
      : page === 'explore'
        ? ja
          ? '見つける'
          : 'Explore'
        : page === 'following'
          ? ja
            ? 'フォロー中'
            : 'Following'
          : page === 'notifications'
            ? ja
              ? '通知'
              : 'Notifications'
            : ja
              ? 'プロフィール'
              : 'Profile';

  return (
    <div className={`community-root${closing ? ' is-closing' : ''}`}>
      <button
        className="community-gutter"
        type="button"
        onClick={closeDrawer}
        aria-label={ja ? '閉じる' : 'Close'}
      />
      <section
        className="community-app"
        role="dialog"
        aria-modal="true"
        aria-label={ja ? 'みんなの活動' : 'Community'}
      >
        <Sidebar
          page={page}
          user={user}
          ja={ja}
          unreadCount={unreadCount}
          go={go}
          onLogin={() => setModal({ kind: 'auth', mode: 'login' })}
        />
        <div className="community-main">
          <header className="community-topbar">
            <div>
              <strong>{pageTitle}</strong>
              <small>CAMPUS COMMUNITY</small>
            </div>
            <button
              className={`community-refresh${refreshing ? ' is-refreshing' : ''}`}
              type="button"
              onClick={() => void refreshCurrentPage()}
              disabled={refreshing}
              aria-label={ja ? '画面を更新' : 'Refresh'}
              title={ja ? '更新' : 'Refresh'}
            >
              {refreshing ? <Busy /> : <Glyph name="refresh" />}
              <span>{refreshing ? (ja ? '更新中' : 'Refreshing') : ja ? '更新' : 'Refresh'}</span>
            </button>
            {!user ? (
              <div className="community-auth-actions">
                <button onClick={() => setModal({ kind: 'auth', mode: 'register' })}>
                  {ja ? '新規登録' : 'Sign up'}
                </button>
                <button
                  className="is-primary"
                  onClick={() => setModal({ kind: 'auth', mode: 'login' })}
                >
                  {ja ? 'ログイン' : 'Log in'}
                </button>
              </div>
            ) : (
              <button className="community-logout" onClick={() => void logout()}>
                {ja ? 'ログアウト' : 'Log out'}
              </button>
            )}
            <button
              className="community-close"
              type="button"
              onClick={closeDrawer}
              aria-label={ja ? '閉じる' : 'Close'}
            >
              <Glyph name="close" />
            </button>
          </header>
          {page === 'home' ? (
            <HomeScreen
              posts={posts}
              loading={loading}
              error={error}
              ja={ja}
              onRetry={loadFeed}
              onCreate={() => go('create')}
              onExplore={() => go('explore')}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
            />
          ) : null}
          {page === 'explore' ? (
            <ExploreScreen
              posts={visiblePosts}
              loading={loading}
              query={query}
              tag={tag}
              tags={tags}
              users={searchUsers}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
            />
          ) : null}
          {page === 'following' ? (
            <ExploreScreen
              posts={visibleFollowingPosts}
              loading={loading}
              query={query}
              tag={tag}
              tags={followingTags}
              users={[]}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
              title={ja ? 'フォロー中' : 'Following'}
              description={
                ja
                  ? 'フォローしているユーザーの投稿だけを表示します。'
                  : 'Posts from people you follow.'
              }
            />
          ) : null}
          {page === 'notifications' ? (
            <NotificationsScreen
              notifications={notifications}
              ja={ja}
              onOpenProfile={(loginId) => void openProfile(loginId)}
            />
          ) : null}
          {page === 'profile' && profileUser ? (
            <ProfileScreen
              user={profileUser}
              viewer={user}
              posts={profilePosts}
              ja={ja}
              isOwn={Boolean(user && profileUser.loginId === user.loginId)}
              onEdit={openProfileEditor}
              onCreate={() => go('create')}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
              onFollow={() => void toggleFollow(profileUser)}
              onConnections={(relation) => void openConnections(profileUser, relation)}
              onTagClick={openTag}
            />
          ) : null}
        </div>
        <MobileNav
          page={page}
          user={user}
          ja={ja}
          unreadCount={unreadCount}
          go={go}
          onLogin={() => setModal({ kind: 'auth', mode: 'login' })}
        />
        <ModalLayer
          modal={modal}
          token={token}
          user={user}
          ja={ja}
          busy={busy}
          error={error}
          defaultAuthorName={defaultAuthorName}
          postImages={postImages}
          updatePostImages={setPostImages}
          avatarImage={avatarImage}
          headerImage={headerImage}
          suggestedTags={tags.filter((item) => item !== ALL_TAG)}
          close={closeModal}
          toggleLike={(post) => void toggleLike(post)}
          setAuthMode={setAuthMode}
          authenticate={authenticate}
          submitPost={submitPost}
          saveProfile={saveProfile}
          removePost={removePost}
          requestDelete={(post) => setModal({ kind: 'delete', post })}
          openLikes={openLikes}
          canDeletePost={canDeletePost}
          openTag={openTag}
          openProfile={(loginId) => void openProfile(loginId)}
          readPost={readPostFiles}
          readAvatar={readAvatar}
          readHeader={readHeader}
        />
      </section>
    </div>
  );
}
