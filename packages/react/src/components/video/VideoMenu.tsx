import {
  usePlaylistInclude,
  usePlaylistVideoMutation,
} from "@/services/playlist.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shadcn/ui/dropdown-menu";
import { ReactNode, Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "usehooks-ts";
import { useToast } from "@/shadcn/ui/use-toast";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { queueAtom } from "@/store/queue";
import { VideoCardType } from "./VideoCard";
import "./VideoMenu.css";
import {
  selectedVideoSetReadonlyAtom,
  useVideoSelection,
} from "@/hooks/useVideoSelection";
import { TLDexLogo } from "../common/TLDexLogo";
import { userAtom } from "@/store/auth";
import { videoReportAtom } from "@/store/video";

const LazyNewPlaylistDialog = lazy(
  () => import("@/components/playlist/NewPlaylistDialog"),
);

interface VideoMenuProps {
  video: VideoCardType;
  children: ReactNode;
  url?: string;
}

export function VideoMenu({ children, video, url }: VideoMenuProps) {
  const videoId = video.id;
  // standard functionality of menu
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  // Queueing behavior
  const [queue, setQueue] = useAtom(queueAtom);
  const isQueued = queue.some(({ id }) => videoId === id);

  const isTwitch = url?.includes("twitch");
  const isYoutube = url?.includes("youtu");

  // Selection behavior
  const { addVideo, removeVideo, setSelectionMode } = useVideoSelection();
  const isSelected = useAtomValue(selectedVideoSetReadonlyAtom).has(videoId);

  const [, copy] = useCopyToClipboard();
  const setReportedVideo = useSetAtom(videoReportAtom);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      {isOpen && (
        <DropdownMenuContent
          onClick={(e) => e.stopPropagation()}
          // className="border-base-5"
          className="tracking-tight"
        >
          {isQueued ? (
            <DropdownMenuItem
              className="video-menu-item"
              onClick={() =>
                setQueue((q) => q.filter(({ id }) => videoId !== id))
              }
            >
              <div className="i-lucide:list-x" />
              {t("views.watch.removeFromQueue")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="video-menu-item"
              onClick={() => setQueue((q) => [...q, video])}
            >
              <div className="i-lucide:list-plus" />
              {t("views.watch.addToQueue")}
            </DropdownMenuItem>
          )}
          {url && (
            <DropdownMenuItem asChild>
              <Link className="video-menu-item" to={url} target="_blank">
                <div className="i-lucide:external-link" />
                {isTwitch
                  ? t("views.watch.openOnTwitch")
                  : isYoutube
                    ? t("views.settings.redirectModeLabel")
                    : "Open URL"}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="video-menu-item"
            onClick={() => {
              copy(`${window.origin}/watch/${videoId}`);
              toast({ title: t("component.toast.copiedToClipboard") });
            }}
          >
            <div className="i-heroicons:link-20-solid" />
            {t("component.videoCard.copyLink")}
          </DropdownMenuItem>
          {video.type !== "clip" && (
            <DropdownMenuItem asChild>
              <Link
                className="video-menu-item"
                to={`/multiview/AAUY${videoId}%2cUAEYchat`}
              >
                <div className="i-heroicons:rectangle-group" />
                {t("component.mainNav.multiview")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="video-menu-item bg-base-1">
                <div className="i-heroicons:queue-list" />
                {t("component.mainNav.playlist")}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <PlaylistMenuItems videoId={videoId} />
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          {!isTwitch && (
            <DropdownMenuItem asChild>
              <Link className="video-menu-item" to={`/edit/video/${videoId}`}>
                <div className="i-lucide:edit-3" />
                {t("component.videoCard.edit")}
              </Link>
            </DropdownMenuItem>
          )}
          {!isSelected && (
            <DropdownMenuItem
              className="video-menu-item"
              onClick={() => {
                addVideo(video as unknown as PlaceholderVideo);
                setSelectionMode(true);
              }}
            >
              <div className="i-ph:selection-plus-bold" />
              Add to Selection
            </DropdownMenuItem>
          )}
          {isSelected && (
            <DropdownMenuItem
              className="video-menu-item"
              onClick={() => removeVideo(videoId)}
            >
              <div className="i-ph:selection-slash-bold" />
              Remove from Selections
            </DropdownMenuItem>
          )}
          {video.status === "upcoming" && (
            <DropdownMenuItem className="video-menu-item">
              <div className="i-heroicons:calendar" />
              {t("component.videoCard.googleCalendar")}
            </DropdownMenuItem>
          )}
          {(video.status == "upcoming" || video.status === "live") && (
            <DropdownMenuItem className="video-menu-item">
              <TLDexLogo size={16} />
              {t("component.videoCard.openClient")}
            </DropdownMenuItem>
          )}
          {video.status === "past" && (
            <DropdownMenuItem className="video-menu-item">
              <div className="i-heroicons:document-arrow-up" />
              {t("component.videoCard.uploadScript")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="video-menu-item"
            onClick={() => {
              setReportedVideo(video as unknown as Video);
            }}
          >
            <div className="i-heroicons:flag" />
            {t("component.reportDialog.title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

function PlaylistMenuItems({ videoId }: { videoId: string }) {
  const { t } = useTranslation();
  const { mutate } = usePlaylistVideoMutation();
  const { data, isLoading } = usePlaylistInclude(videoId, { enabled: true });
  const user = useAtomValue(userAtom);

  return (
    <DropdownMenuSubContent>
      {!user ? (
        <DropdownMenuItem asChild>
          <Link to="/login">{t("component.mainNav.login")}</Link>
        </DropdownMenuItem>
      ) : (
        <>
          {data?.map(({ name, id }) => (
            <DropdownMenuItem key={id} onClick={() => mutate({ id, videoId })}>
              {name}
            </DropdownMenuItem>
          ))}
          {isLoading && (
            <DropdownMenuItem className="justify-center" disabled>
              <div className="i-lucide:loader-2 animate-spin leading-none" />
            </DropdownMenuItem>
          )}
          {data?.length || isLoading ? <DropdownMenuSeparator /> : null}
          <Suspense
            fallback={
              <div className="i-lucide:loader-2 animate-spin leading-none" />
            }
          >
            <LazyNewPlaylistDialog
              triggerElement={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  {t("component.playlist.menu.new-playlist")}
                </DropdownMenuItem>
              }
              videoIds={[videoId]}
            />
          </Suspense>
        </>
      )}
    </DropdownMenuSubContent>
  );
}
