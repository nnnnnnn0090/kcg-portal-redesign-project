import { useEffect, useMemo, useState } from 'react';
import { ALL_TAG, COMMUNITY_CONNECTION_ERROR } from './constants';
import { collectTags, filterPosts } from './utils';
import { CommunityConnectionOverlay } from './components/CommunityConnectionOverlay';
import { CommunityConnectionStatus } from './components/CommunityConnectionStatus';
import { CommunityNotificationToast } from './components/CommunityNotificationToast';
import { Glyph } from './components/Glyph';
import { MobileNav, Sidebar } from './components/Navigation';
import { ModalLayer } from './dialogs/ModalLayer';
import { ExploreScreen } from './screens/ExploreScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  useCommunityActions,
  useCommunityState,
  useCommunityStreamUi,
} from './state/CommunityProvider';
import { cn } from '../../lib/cn';

export function CommunityShell() {
  const state = useCommunityState();
  const actions = useCommunityActions();
  const {
    streamDisconnected,
    streamConnecting,
    reconnectStream,
    notificationToast,
    notificationToastClosing,
    dismissNotificationToast,
    handleNotificationToastAnimationEnd,
  } = useCommunityStreamUi();
  const [connectionOutageVisible, setConnectionOutageVisible] = useState(false);
  const {
    ja,
    page,
    modal,
    posts,
    followingPosts,
    bookmarkedPosts,
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
    busy,
    error,
    postImages,
    avatarImage,
    headerImage,
    closing,
    commentsRevision,
    postsNextCursor,
    followingNextCursor,
    feedLoadingMore,
  } = state;
  const {
    closeDrawer,
    loadFeed,
    loadMoreFeed,
    loadMoreFollowing,
    go,
    openProfile,
    openPost,
    openNotification,
    openTag,
    openConnections,
    authenticate,
    logout,
    changePassword,
    deleteAccount,
    submitPost,
    saveProfile,
    removePost,
    removeComment,
    toggleLike,
    toggleBookmark,
    recordImpression,
    toggleFollow,
    openLikes,
    submitSuggestion,
    submitContactInquiry,
    openProfileEditor,
    closeModal,
    openDeleteAccount,
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
  const visibleBookmarkedPosts = useMemo(
    () => filterPosts(bookmarkedPosts, query, tag),
    [bookmarkedPosts, query, tag],
  );
  const tags = useMemo(() => collectTags(posts, knownTags, locale), [knownTags, locale, posts]);
  const followingTags = useMemo(
    () => collectTags(followingPosts, [], locale),
    [followingPosts, locale],
  );
  const bookmarkTags = useMemo(
    () => collectTags(bookmarkedPosts, [], locale),
    [bookmarkedPosts, locale],
  );
  const feedFailed =
    error === (ja ? COMMUNITY_CONNECTION_ERROR.ja : COMMUNITY_CONNECTION_ERROR.en);
  useEffect(() => {
    if (feedFailed) {
      setConnectionOutageVisible(true);
      return;
    }
    if (streamDisconnected) {
      const timer = window.setTimeout(() => {
        setConnectionOutageVisible(true);
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    if (!streamConnecting) {
      setConnectionOutageVisible(false);
    }
  }, [feedFailed, streamConnecting, streamDisconnected]);

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
          : page === 'bookmarks'
            ? ja
              ? '保存済み'
              : 'Bookmarks'
            : page === 'notifications'
              ? ja
                ? '通知'
                : 'Notifications'
              : page === 'feedback'
                ? ja
                  ? 'お問い合わせ・意見箱'
                  : 'Contact and feedback'
                : page === 'settings'
                  ? ja
                    ? '設定'
                    : 'Settings'
                  : ja
                    ? 'プロフィール'
                    : 'Profile';

  return (
    <div
      className={cn(
        'community-root tw-fixed tw-inset-0 tw-z-[2147483300] tw-grid tw-grid-cols-[clamp(44px,6vw,88px)_minmax(0,1fr)] tw-font-community tw-text-sm tw-leading-relaxed tw-text-community-text tw-animate-community-fade-in max-[960px]:tw-grid-cols-[52px_minmax(0,1fr)] max-[620px]:tw-grid-cols-[24px_minmax(0,1fr)] max-[420px]:tw-grid-cols-[12px_minmax(0,1fr)] [&_*]:tw-box-border [&_*]:tw-border-0 [&_*]:tw-border-solid [&_.tw-border]:tw-border [&_.tw-border-2]:tw-border-2 [&_.tw-border-y]:tw-border-y [&_.tw-border-b]:tw-border-b [&_.tw-border-l]:tw-border-l [&_.tw-border-r]:tw-border-r [&_.tw-border-t]:tw-border-t [&_.tw-border-dashed]:tw-border-dashed [&_button]:tw-appearance-none [&_button]:tw-font-inherit [&_button]:tw-transition-[background-color,border-color,color,box-shadow,opacity,filter,transform] [&_button]:tw-duration-200 [&_button]:tw-ease-out hover:[&_button:not(:disabled)]:tw-brightness-110 active:[&_button:not(:disabled)]:tw-scale-[.98] [&_input]:tw-font-inherit [&_textarea]:tw-font-inherit [&_button:focus-visible]:tw-outline [&_button:focus-visible]:tw-outline-2 [&_button:focus-visible]:tw-outline-community-accent [&_button:focus-visible]:tw-outline-offset-2 [&_a:focus-visible]:tw-outline [&_a:focus-visible]:tw-outline-2 [&_a:focus-visible]:tw-outline-community-accent [&_a:focus-visible]:tw-outline-offset-2 [&.is-closing]:tw-pointer-events-none [&.is-closing]:tw-animate-community-fade-out motion-reduce:[&_*]:tw-transition-none motion-reduce:[&_*]:tw-animate-none',
        closing && 'is-closing',
      )}
    >
      <button
        className={
          'community-gutter tw-cursor-w-resize tw-border-0 tw-bg-[color-mix(in_srgb,#000_48%,transparent)]'
        }
        type="button"
        onClick={closeDrawer}
        aria-label={ja ? '閉じる' : 'Close'}
      />
      <section
        id="p-community-activity-drawer"
        className={
          'community-app tw-relative tw-grid tw-h-full tw-min-w-0 tw-grid-cols-[224px_minmax(0,1fr)] tw-overflow-hidden tw-bg-community-bg tw-shadow-[-18px_0_60px_color-mix(in_srgb,#000_30%,transparent)] tw-animate-community-slide-in max-[960px]:tw-grid-cols-[76px_minmax(0,1fr)] max-[620px]:tw-block [.is-closing_&]:tw-animate-community-slide-out'
        }
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
        <div
          className={
            'community-main tw-grid tw-h-full tw-min-w-0 tw-grid-rows-[56px_minmax(0,1fr)] tw-overflow-hidden max-[620px]:tw-grid-rows-[56px_minmax(0,1fr)_64px]'
          }
        >
          <header
            className={
              'community-topbar tw-flex tw-min-w-0 tw-items-center tw-gap-2 tw-border-b tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg2)_94%,transparent)] tw-px-4 max-[620px]:tw-px-3 max-[420px]:tw-gap-1 [&>div:first-child]:tw-mr-auto [&>div:first-child]:tw-min-w-0 [&_small]:tw-block [&_small]:tw-text-[10px] [&_small]:tw-font-bold [&_small]:tw-tracking-[.08em] [&_small]:tw-text-community-accent-light max-[620px]:[&_small]:tw-hidden [&_strong]:tw-block [&_strong]:tw-overflow-hidden [&_strong]:tw-text-ellipsis [&_strong]:tw-whitespace-nowrap [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright max-[420px]:[&_strong]:tw-max-w-[120px]'
            }
          >
            <div>
              <strong>{pageTitle}</strong>
              <small>CAMPUS COMMUNITY</small>
            </div>
            <button
              type="button"
              className={cn(
                'community-feedback-entry tw-inline-flex tw-h-10 tw-shrink-0 tw-items-center tw-justify-center tw-gap-1.5 tw-whitespace-nowrap tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-font-semibold tw-text-community-text tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light max-[620px]:tw-w-10 max-[620px]:tw-gap-0 max-[620px]:tw-px-0 max-[620px]:tw-text-0 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px]',
                page === 'feedback' && 'tw-border-community-accent tw-bg-community-accent-bg tw-text-community-accent-light',
              )}
              aria-label={ja ? 'お問い合わせ・意見箱' : 'Contact and feedback'}
              aria-current={page === 'feedback' ? 'page' : undefined}
              onClick={() => go('feedback')}
            >
              <Glyph name="comment" />
              <span>{ja ? 'お問い合わせ・意見箱' : 'Contact'}</span>
            </button>
            {user ? (
              <button
                type="button"
                className={cn(
                  'community-settings-entry tw-inline-flex tw-h-10 tw-shrink-0 tw-items-center tw-justify-center tw-gap-1.5 tw-whitespace-nowrap tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-font-semibold tw-text-community-text tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light max-[620px]:tw-w-10 max-[620px]:tw-gap-0 max-[620px]:tw-px-0 max-[620px]:tw-text-0 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px]',
                  page === 'settings' &&
                    'tw-border-community-accent tw-bg-community-accent-bg tw-text-community-accent-light',
                )}
                aria-label={ja ? '設定' : 'Settings'}
                aria-current={page === 'settings' ? 'page' : undefined}
                onClick={() => go('settings')}
              >
                <Glyph name="settings" />
                <span>{ja ? '設定' : 'Settings'}</span>
              </button>
            ) : null}
            {!user ? (
              <div className="community-auth-actions tw-flex tw-items-center tw-gap-2">
                <button
                  type="button"
                  className="tw-inline-flex tw-h-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-font-semibold tw-text-community-text tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light max-[620px]:tw-w-10 max-[620px]:tw-px-1 max-[620px]:tw-text-xs"
                  onClick={() => setModal({ kind: 'auth', mode: 'register' })}
                >
                  {ja ? '新規登録' : 'Sign up'}
                </button>
                <button
                  type="button"
                  className="tw-inline-flex tw-h-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-font-semibold tw-text-community-text tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light max-[620px]:tw-w-10 max-[620px]:tw-px-1 max-[620px]:tw-text-xs"
                  onClick={() => setModal({ kind: 'auth', mode: 'login' })}
                >
                  {ja ? 'ログイン' : 'Log in'}
                </button>
              </div>
            ) : (
              <button
                className={
                  'community-logout tw-inline-flex tw-h-10 tw-min-w-10 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-font-semibold tw-text-community-text tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light max-[620px]:tw-w-10 max-[620px]:tw-px-1 max-[620px]:tw-text-xs'
                }
                onClick={() => void logout()}
              >
                {ja ? 'ログアウト' : 'Log out'}
              </button>
            )}
            <CommunityConnectionStatus
              connecting={streamConnecting}
              disconnected={streamDisconnected}
              ja={ja}
              onReconnect={reconnectStream}
            />
            <button
              className={
                'community-close tw-grid tw-h-10 tw-w-10 tw-flex-none tw-place-items-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-p-0 tw-text-community-text tw-cursor-pointer tw-transition-[background-color,border-color,color,transform] tw-duration-180 hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light hover:tw-rotate-90 active:tw-scale-95 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
              }
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
              onOpen={openPost}
              onLike={(post) => void toggleLike(post)}
              onBookmark={(post) => void toggleBookmark(post)}
              onImpression={recordImpression}
            />
          ) : null}
          {page === 'explore' ? (
            <ExploreScreen
              posts={visiblePosts}
              loading={loading}
              loadingMore={feedLoadingMore}
              hasMore={Boolean(postsNextCursor) && !query && tag === ALL_TAG}
              onLoadMore={() => void loadMoreFeed()}
              query={query}
              tag={tag}
              tags={tags}
              users={searchUsers}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={openPost}
              onLike={(post) => void toggleLike(post)}
              onBookmark={(post) => void toggleBookmark(post)}
              onImpression={recordImpression}
            />
          ) : null}
          {page === 'following' ? (
            <ExploreScreen
              posts={visibleFollowingPosts}
              loading={loading}
              loadingMore={feedLoadingMore}
              hasMore={Boolean(followingNextCursor) && !query && tag === ALL_TAG}
              onLoadMore={() => void loadMoreFollowing()}
              query={query}
              tag={tag}
              tags={followingTags}
              users={[]}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={openPost}
              onLike={(post) => void toggleLike(post)}
              onBookmark={(post) => void toggleBookmark(post)}
              onImpression={recordImpression}
              title={ja ? 'フォロー中' : 'Following'}
              description={
                ja
                  ? 'フォローしているユーザーの投稿だけを表示します。'
                  : 'Posts from people you follow.'
              }
            />
          ) : null}
          {page === 'bookmarks' ? (
            <ExploreScreen
              posts={visibleBookmarkedPosts}
              loading={loading}
              query={query}
              tag={tag}
              tags={bookmarkTags}
              users={[]}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={openPost}
              onLike={(post) => void toggleLike(post)}
              onBookmark={(post) => void toggleBookmark(post)}
              onImpression={recordImpression}
              title={ja ? '保存済み' : 'Bookmarks'}
              description={
                ja ? 'あとで見返したい投稿をまとめて確認できます。' : 'Posts you saved for later.'
              }
            />
          ) : null}
          {page === 'notifications' ? (
            <NotificationsScreen
              notifications={notifications}
              ja={ja}
              onOpen={(item) => void openNotification(item)}
            />
          ) : null}
          {page === 'feedback' ? (
            <FeedbackScreen
              ja={ja}
              busy={busy}
              error={error}
              onSubmitSuggestion={submitSuggestion}
              onSubmitContact={submitContactInquiry}
            />
          ) : null}
          {page === 'settings' && user ? (
            <SettingsScreen
              ja={ja}
              busy={busy}
              error={error}
              onChangePassword={changePassword}
              onRequestDeleteAccount={openDeleteAccount}
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
              onSettings={() => go('settings')}
              onCreate={() => go('create')}
              onOpen={openPost}
              onLike={(post) => void toggleLike(post)}
              onBookmark={(post) => void toggleBookmark(post)}
              onImpression={recordImpression}
              onFollow={() => void toggleFollow(profileUser)}
              onConnections={(relation) => void openConnections(profileUser, relation)}
              onTagClick={openTag}
            />
          ) : null}
        </div>
        {connectionOutageVisible ? (
          <CommunityConnectionOverlay
            ja={ja}
            connecting={streamConnecting || (loading && feedFailed)}
            feedFailed={feedFailed}
            onRetry={() => {
              reconnectStream();
              void loadFeed();
            }}
            onClose={closeDrawer}
          />
        ) : null}
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
          postImages={postImages}
          updatePostImages={setPostImages}
          avatarImage={avatarImage}
          headerImage={headerImage}
          suggestedTags={tags.filter((item) => item !== ALL_TAG)}
          close={
            modal.kind === 'deleteComment'
              ? () => setModal({ kind: 'post', post: modal.post })
              : closeModal
          }
          toggleLike={(post) => void toggleLike(post)}
          toggleBookmark={(post) => void toggleBookmark(post)}
          setAuthMode={setAuthMode}
          authenticate={authenticate}
          submitPost={submitPost}
          saveProfile={saveProfile}
          removePost={removePost}
          removeComment={removeComment}
          deleteAccount={deleteAccount}
          requestDelete={(post) => setModal({ kind: 'delete', post })}
          requestDeleteComment={(post, comment) =>
            setModal({ kind: 'deleteComment', post, comment })
          }
          backToPost={(post) => setModal({ kind: 'post', post })}
          openLikes={openLikes}
          canDeletePost={canDeletePost}
          commentsRevision={commentsRevision}
          openTag={openTag}
          openProfile={(loginId) => void openProfile(loginId)}
          readPost={readPostFiles}
          readAvatar={readAvatar}
          readHeader={readHeader}
        />
        <CommunityNotificationToast
          notification={notificationToast}
          closing={notificationToastClosing}
          ja={ja}
          onOpen={() => {
            const current = notificationToast;
            dismissNotificationToast();
            if (current) void openNotification(current);
          }}
          onDismiss={dismissNotificationToast}
          onAnimationEnd={handleNotificationToastAnimationEnd}
        />
      </section>
    </div>
  );
}
