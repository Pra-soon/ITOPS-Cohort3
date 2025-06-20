import {
  SideNavigation,
  SideNavigationProps,
  Header,
  Button,
  Box,
  SpaceBetween,
  StatusIndicator
} from "@cloudscape-design/components";
import useOnFollow from "../common/hooks/use-on-follow";
import { useNavigationPanelState } from "../common/hooks/use-navigation-panel-state";
import { AppContext } from "../common/app-context";
import PencilSquareIcon from "../../public/images/pencil-square.jsx";
import RouterButton from "../components/wrappers/router-button";
import { useContext, useState, useEffect } from "react";
import { ApiClient } from "../common/api-client/api-client";
import { Auth } from "aws-amplify";
import { v4 as uuidv4 } from "uuid";
import {SessionRefreshContext} from "../common/session-refresh-context"
import { useNotifications } from "../components/notif-manager";
import { Utils } from "../common/utils.js";

export default function NavigationPanel() {
  const appContext = useContext(AppContext);
  const apiClient = new ApiClient(appContext);
  const onFollow = useOnFollow();
  const [navigationPanelState, setNavigationPanelState] =
    useNavigationPanelState();
  const [items, setItems] = useState<SideNavigationProps.Item[]>([]);
  const [loaded,setLoaded] = useState<boolean>(false);
  const {needsRefresh, setNeedsRefresh} = useContext(SessionRefreshContext);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const { addNotification, removeNotification } = useNotifications();
  const [activeHref, setActiveHref] = useState(
    window.location.pathname
  );
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [allSessions, setAllSessions] = useState([]);

  // add button text to sidebar nav collapse button
  useEffect(() => {
    const div = document.querySelector('.awsui_hide-navigation_hyvsj_17ek5_827');
    const btn = div?.querySelector('button');
    
    if (btn) {
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = 'Collapse sidebar navigation panel';
  
      // makes text invisible
      hiddenSpan.style.position = 'absolute';
      hiddenSpan.style.width = '1px';
      hiddenSpan.style.height = '1px';
      hiddenSpan.style.padding = '0';
      hiddenSpan.style.margin = '-1px';
      hiddenSpan.style.overflow = 'hidden';
      hiddenSpan.style.whiteSpace = 'nowrap';
      hiddenSpan.style.border = '0';
  
      btn.appendChild(hiddenSpan);
    }
  
  }, []);

  // update the list of sessions every now and then
  const loadSessions = async () => {
    let username;
    try {
    await Auth.currentAuthenticatedUser().then((value) => username = value.username);
    if (username && needsRefresh) {
      // let's wait for about half a second before refreshing the sessions      
      const fetchedSessions = await apiClient.sessions.getSessions(username);  
      setAllSessions(fetchedSessions);
      await updateItems(fetchedSessions);
      console.log("fetched sessions")
      // console.log(fetchedSessions);
      if (!loaded) {
        setLoaded(true);
      }
      setNeedsRefresh(false);
    }
  }  catch (error) {
    console.error("Failed to load sessions:", error);
    setLoaded(true);
    addNotification("error", "Could not load sessions:".concat(error.message));
    addNotification("info", "Please refresh the page");    
    // const delay = ms => new Promise(res => setTimeout(res, ms));
    // delay(3000).then(() => removeNotification(id));
    
  } finally {
    setLoadingSessions(false);
  }
}
  useEffect(() => {
   

    // const interval = setInterval(loadSessions, 1000);
    // loadSessions();

    // return () => clearInterval(interval);
    loadSessions(); 
  }, [needsRefresh]);


  const onReloadClick = async () => {
    await loadSessions();
    const id =addNotification("success", "Sessions reloaded successfully!");
    Utils.delay(3000).then(() => removeNotification(id))
  };

  // Update items when showAllSessions state changes
  useEffect(() => {
    if (allSessions.length > 0) {
      updateItems(allSessions);
    }
  }, [showAllSessions]);

  const updateItems = async (sessions) => {
    // Determine which sessions to show
    const sessionsToShow = showAllSessions ? sessions : sessions.slice(0, 3);
    const hasMoreSessions = sessions.length > 3;
    
    // Create session items
    const sessionItems = sessionsToShow.map(session => ({
      type: "link",
      text: `${session.title}`,
      href: `/chatbot/playground/${session.session_id}`,
    }));

    // Add "See More" button if needed
    const additionalItems = [];
    if (!showAllSessions && hasMoreSessions) {
      additionalItems.push({
        type: "link",
        info: <Box margin="xxs" textAlign="center">
          <Button 
            onClick={() => setShowAllSessions(true)} 
            iconName="caret-down-filled" 
            variant="link"
          >
            See All Sessions
          </Button>
        </Box>
      });
    } else if (showAllSessions && hasMoreSessions) {
      additionalItems.push({
        type: "link",
        info: <Box margin="xxs" textAlign="center">
          <Button 
            onClick={() => setShowAllSessions(false)} 
            iconName="caret-up-filled" 
            variant="link"
          >
            Show Less
          </Button>
        </Box>
      });
    }

    // Add reload button
    additionalItems.push({
      type: "link",
      info: <Box margin="xxs" textAlign="center">
        <Button 
          onClick={onReloadClick} 
          iconName="refresh" 
          loading={loadingSessions} 
          variant="link"
        >
          Reload Sessions
        </Button>
      </Box>
    });

    const newItems: SideNavigationProps.Item[] = [
      {
        type: "section",
        text: "Session History",
        items: [...sessionItems, ...additionalItems],
      },      
    ];
    try {
    const result = await Auth.currentAuthenticatedUser();
    const admin = result?.signInUserSession?.idToken?.payload["custom:role"]
    if (admin) {
      const data = JSON.parse(admin);
      if (data.includes("Admin")) {
        const startDate = (new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1)).toISOString();
        const endDate = (new Date()).toISOString();
        const invocationCount = await apiClient.metrics.getInvocationCount();
        const usesPerUsers = 1;//await apiClient.metrics.getAvgUsesPerUsers(startDate, endDate);

        console.log("admin found!")
        newItems.push({
          type: "section",
          text: "Admin",
          items: [
            { type: "link", text: "Data", href: "/admin/data" },
            { type: "link", text: "User Feedback", href: "/admin/user-feedback" },
            { type: "link", text: "Evaluation", href: "/admin/llm-evaluation" },
            { type: "link", text: "KPIs", href: "/admin/kpis" },
          ],
        },)
      }
    }
  } catch (e) {
    console.log(e)
  }
    setItems(newItems);
  };

  const onChange = ({
    detail,
  }: {
    detail: SideNavigationProps.ChangeDetail;
  }) => {
    // const sectionIndex = items.findIndex(detail.item);
    const sectionIndex = items.indexOf(detail.item);
    setNavigationPanelState({
      collapsedSections: {
        ...navigationPanelState.collapsedSections,
        [sectionIndex]: !detail.expanded,
      },
    });
  };


  return (
    <div>
      {/* <div style={{ justifyContent: 'center' }}>
        <Header >
          MBTA The RIDE Guide AI
        </Header>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <RouterButton
          iconAlign="right"
          iconSvg={<PencilSquareIcon />}
          variant="primary"
          href={`/chatbot/playground/${uuidv4()}`}
        >
          New session
        </RouterButton>

      </div>
  <Header>*/}
      <Box margin="xs" padding={{ top: "l" }} textAlign="center">
        <RouterButton
          iconAlign="right"
          iconSvg={<PencilSquareIcon />}
          variant="primary"
          href={`/chatbot/playground/${uuidv4()}`}
          data-alignment="right"
          className="new-chat-button"
          style={{ textAlign: "right" }}
        >
          New session

        </RouterButton>
      </Box>            
      {loaded ?
      <SideNavigation
        activeHref={activeHref}
        // onFollow={onFollow}
        onFollow={event => {
          if (!event.detail.external) {
            event.preventDefault();
            setActiveHref(event.detail.href);
            onFollow(event);
          }
        }}
        onChange={onChange}
        // header={{ href: "/", text: "The Ride Guide AI" }}
        // items={items.map((item, idx) => ({
        //   ...item,
        //   defaultExpanded: !navigationPanelState.collapsedSections[idx]
        // }))}  
        items={items}
        // items={Array.isArray(items) ? items.map((item, idx) => ({
        //   ...item,
        //   defaultExpanded: !navigationPanelState.collapsedSections[idx]
        // })) : []}
        
      /> : 
      <Box margin="xs" padding="xs" textAlign="center">
        <StatusIndicator type="loading">Loading sessions...</StatusIndicator>
      </Box>}
    </div>
  );
}