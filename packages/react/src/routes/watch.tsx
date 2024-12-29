import { ChannelCard } from "@/components/channel/ChannelCard";
import { ChatModal } from "@/components/chat/ChatModal";
import { PlayerWrapper } from "@/components/layout/PlayerWrapper";
import { ChatCard } from "@/components/player/ChatCard";
import { Controlbar } from "@/components/player/Controlbar";
import { Mentions } from "@/components/player/MentionsCard";
import { PlayerDescription as Description } from "@/components/player/PlayerDescription";
import { PlayerRecommendations as Recommendations } from "@/components/player/PlayerRecommendations";
import { PlayerStats } from "@/components/player/PlayerStats";
import { QueueList } from "@/components/player/QueueList";
import { useIsLgAndUp } from "@/hooks/useBreakpoint";
import { headerHiddenAtom } from "@/hooks/useFrame";
import { cn, idToVideoURL } from "@/lib/utils";
import { useChannel } from "@/services/channel.service";
import { useVideo } from "@/services/video.service";
import {
  chatOpenAtom,
  chatPosAtom,
  miniPlayerAtom,
  theaterModeAtom,
  tlOpenAtom,
} from "@/store/player";
import { queueAtom } from "@/store/queue";
import { clipLanguageQueryAtom } from "@/store/settings";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useParams } from "react-router-dom";

export function Watch() {
  const location = useLocation();
  const { id } = useParams();
  const clipLangQuery = useAtomValue(clipLanguageQueryAtom);
  const {
    data: currentVideo,
    isSuccess,
    isPlaceholderData,
  } = useVideo<PlaceholderVideo>(
    { id: id!, lang: clipLangQuery, c: "1" },
    {
      enabled: !!id,
      refetchOnMount: true,
      staleTime: 30 * 1000,
      placeholderData: () => {
        if (location.state?.video && location.state?.video.channel)
          return location.state?.video;
      },
    },
  );
  const { data: channel } = useChannel(currentVideo?.channel.id ?? "", {
    enabled: !!currentVideo,
    placeholderData: () => {
      if (location.state?.video && location.state?.video.channel)
        return location.state?.video.channel;
    },
  });

  const queue = useAtomValue(queueAtom);
  const [miniPlayer, setMiniPlayer] = useAtom(miniPlayerAtom);
  const theaterMode = useAtomValue(theaterModeAtom);
  const [chatOpen, setChatOpen] = useAtom(chatOpenAtom);
  const [tlOpen, setTLOpen] = useAtom(tlOpenAtom);
  const chatPos = useAtomValue(chatPosAtom);

  const smOrMd = !useIsLgAndUp();

  const url = idToVideoURL(id!, currentVideo?.link);

  const makeHeaderHidden = useSetAtom(headerHiddenAtom);
  useEffect(() => {
    // hides the holodex default header
    if (theaterMode) makeHeaderHidden(true);
    return () => makeHeaderHidden(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theaterMode]);

  useEffect(() => {
    setMiniPlayer(false);
  }, []);

  return (
    <>
      <Helmet>
        <title>{currentVideo?.title}</title>
        <meta name="description" content={currentVideo?.description} />
      </Helmet>
      <div className="flex h-full w-full @container">
        <div
          className={cn("mx-auto flex w-full gap-8", {
            " p-4 pt-2 max-w-screen-2xl": !theaterMode,
          })}
        >
          <div className={cn("flex w-full flex-col gap-4")}>
            <div
              className={cn("flex w-full flex-col bg-base-3", [
                theaterMode
                  ? "aspect-video @screen-lg:h-dvh"
                  : "overflow-hidden rounded-lg",
              ])}
            >
              {!miniPlayer && currentVideo && (
                <div
                  className={cn("flex h-full w-full", {
                    "flex-row-reverse": chatPos === "left",
                  })}
                >
                  <div className="grow">
                    <PlayerWrapper
                      id={currentVideo?.id}
                      url={url}
                      // className="h-full w-full"
                      // style={{ aspectRatio: theaterMode ? "" : "16 / 9" }}
                    />
                  </div>
                  {theaterMode && currentVideo && (chatOpen || tlOpen) && (
                    <div className="hidden min-w-[24rem] @screen-lg:flex">
                      <ChatCard {...currentVideo} />
                    </div>
                  )}
                </div>
              )}
              {currentVideo && <Controlbar video={currentVideo} url={url} />}
            </div>
            <div
              className={cn("flex flex-col gap-1", {
                "px-4 @screen-lg:px-8 py-4": theaterMode,
              })}
            >
              <h2 className="text-xl font-bold">{currentVideo?.title}</h2>
              {currentVideo && <PlayerStats {...currentVideo} />}
            </div>
            <div
              className={cn("flex flex-col gap-4", {
                "px-4 @screen-lg:px-8 pb-8": theaterMode,
              })}
            >
              {channel && <ChannelCard size="xs" variant="list" {...channel} />}
              {currentVideo?.mentions && (
                <Mentions mentions={currentVideo.mentions} />
              )}
              {!currentVideo?.link?.includes("twitch") &&
                currentVideo?.description && (
                  <Description description={currentVideo.description} />
                )}
              <div className="flex @screen-lg:hidden">
                <Recommendations {...currentVideo} />
              </div>
            </div>
          </div>
          {!theaterMode && (
            <div className="hidden w-96 shrink-0 flex-col gap-4 @screen-lg:flex">
              {!!queue.length && <QueueList currentId={currentVideo?.id} />}
              {(currentVideo?.type === "stream" ||
                currentVideo?.status === "live") && (
                <div
                  className={cn("overflow-hidden", {
                    "h-[80vh] max-h-[80vh]": chatOpen || tlOpen,
                  })}
                >
                  <ChatCard {...currentVideo} />
                </div>
              )}
              <Recommendations {...currentVideo} />
            </div>
          )}
        </div>
        {currentVideo && smOrMd && (
          <ChatModal
            tlOpen={tlOpen}
            chatOpen={chatOpen}
            id={currentVideo.id}
            status={currentVideo.status}
            channelId={currentVideo.channel.id}
          />
        )}
      </div>
    </>
  );
}
