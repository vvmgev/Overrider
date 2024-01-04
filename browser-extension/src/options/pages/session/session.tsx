import Section from "@options/components/common/section/section";
import SessionPlayer from "@options/components/common/sessionPlayer/sessionPlayer";
import OutlineButton from "@options/components/common/outlineButton/outlineButton";
import BackButton from "@options/components/common/backButton/backButton";
import TrashSVG from "@assets/icons/trash.svg";
import ShareSVG from "@assets/icons/share.svg";
import { EventType, IncrementalSource } from "rrweb";
import { FC, ReactElement, useContext, useEffect, useMemo, useState } from "react";
import { PostMessageAction } from "@models/postMessageActionModel";
import { useParams, useLocation } from "react-router-dom";
import { RecordSession } from "@models/recordSessionModel";
import { SideBarContext } from "@context/sideBarContext";
import { useNavigate } from "react-router-dom";
import { timeDifference } from "@utils/timeDifference";

const Session: FC = (): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<RecordSession>();
  const { setFull } = useContext(SideBarContext);
  const { id } = useParams();
  const sessionMemo = useMemo(() => session, [session]);
  const playerOptions = useMemo(() => ({ width: 800, height: 500 }), []);

  useEffect(() => {
    setFull(false);

    return () => {
      setFull(true);
    };
  }, [location]);

  useEffect(() => {
    chrome.runtime.sendMessage(
      {
        action: PostMessageAction.GetRecordedSessionById,
        data: { id },
      },
      (session) => {
        if (session.events?.length > 1) {
          setSession(session);
        }
      }
    );
  }, []);

  const handleShare = () => {
    chrome.runtime.sendMessage(
      {
        action: PostMessageAction.ShareRecordedSession,
        data: { session },
      },
      (id) => {
        console.log("shared", id);
      }
    );
  };

  const handleDelete = () => {
    chrome.runtime.sendMessage(
      {
        action: PostMessageAction.DeleteRecordedSessionById,
        data: { id: session?.id },
      },
      () => navigate(-1)
    );
  };

  const getDuration = (session) => {
    try {
      const { minutes, seconds } = timeDifference(
        session.events[0].timestamp,
        session.events[session.events.length - 1].timestamp
      );
      return `${minutes > 0 ? `${minutes}m` : ""} ${seconds}s `;
    } catch (error) {
      return "";
    }
  };

  const isEventConsole = (event) => {
    if (event.type === EventType.IncrementalSnapshot) {
      return event.data.source === IncrementalSource.Log;
    }
    if (event.type === EventType.Plugin) {
      return event.data.plugin === "rrweb/console@1";
    }
  };

  const consoleLogs = useMemo(() => {
    return session?.events
      ?.map((event) => {
        let logData: any = null;

        if (isEventConsole(event)) {
          if (event.type === EventType.IncrementalSnapshot) {
            logData = event.data;
          }
          if (event.type === EventType.Plugin) {
            logData = event.data.payload;
          }
          return logData;
        }
      })
      .filter((logData) => !!logData);
  }, [session?.events]);

  return (
    <Section classes="mx-[5%] p-5 flex flex-col gap-5">
      {session && (
        <>
          <div className="flex justify-between">
            <BackButton trackName="session" url="/record/session" text="Sessions" />
            <div className="text-xl capitalize">{session?.name}</div>
            <div className="flex gap-2">
              <OutlineButton
                trackName="Delete Recorded Session in view mode"
                classes="hover:border-red-400 hover:text-red-400"
                onClick={handleDelete}
                icon={<TrashSVG />}
              >
                Delete
              </OutlineButton>
              <OutlineButton trackName="Share Recorded Session in view mode" onClick={handleShare} icon={<ShareSVG />}>
                Share
              </OutlineButton>
            </div>
          </div>
          <div className="flex gap-5">
            <Section classes="rounded flex gap-2 max-w-[300px] whitespace-nowrap	">
              <span className="text-slate-400">URL: </span>
              <span>{session.url}</span>
            </Section>
            <Section classes="rounded flex gap-2">
              <span className="text-slate-400">Recorded at: </span>
              <span>{session.date}</span>
            </Section>
            <Section classes="rounded flex gap-2">
              <span className="text-slate-400">Duraction: </span>
              <span>{getDuration(session)}</span>
            </Section>
          </div>
        </>
      )}
      <div className="m-auto">
        <SessionPlayer session={sessionMemo} playerOptions={playerOptions} />
      </div>
    </Section>
  );
};

export default Session;
