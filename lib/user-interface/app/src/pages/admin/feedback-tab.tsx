import {
  Box,
  SpaceBetween,
  Table,
  DateRangePicker,
  Pagination,
  Button,
  Header,
  Modal,
  Select,
  Spinner,
  FormField,
  Textarea,
  TextContent,
  DateRangePickerProps,
} from "@cloudscape-design/components";
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.all';
import { DateTime } from "luxon";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import RouterButton from "../../components/wrappers/router-button";
import { RagDocumentType } from "../../common/types";
import { TableEmptyState } from "../../components/table-empty-state";
import { ApiClient } from "../../common/api-client/api-client";
import { AppContext } from "../../common/app-context";
import { PropertyFilterI18nStrings } from "../../common/i18n/property-filter-i18n-strings";
// import {I18nStrings} from 
// import { I18nProvider } from '@cloudscape-design/components/i18n';
// import {DatePickerProps.I18nStrings} from ;
import { getColumnDefinition } from "./columns";
// import { I18nProviderProps } from "@cloudscape-design/components/i18n";
import { Utils } from "../../common/utils";
import { useCollection } from "@cloudscape-design/collection-hooks";
import React from 'react';
import { useNotifications } from "../../components/notif-manager";
import {feedbackCategories, feedbackTypes} from '../../common/constants'
//import { FeedbackResult } from "../../../API";
export interface FeedbackTabProps {
  updateSelectedFeedback: React.Dispatch<any>;
}

export default function FeedbackTab(props: FeedbackTabProps) {
  const appContext = useContext(AppContext);
  const apiClient = new ApiClient(appContext);
  const [loading, setLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const needsRefresh = useRef<boolean>(false);

  const [
    selectedOption,
    setSelectedOption
  ] = React.useState({label : "Any", value: "any", disabled: false});
  const [value, setValue] = React.useState<DateRangePickerProps.AbsoluteValue>({
    type: "absolute",
    startDate: (new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1)).toISOString(),
    endDate: (new Date()).toISOString()
  });

  // fix "empty" close modal buttons
  useEffect(() => {
    const fixEmptyButtons = () => {
      const buttons = document.querySelectorAll('button.awsui_dismiss-control_1d2i7_11r6m_431.awsui_button_vjswe_1tt9v_153');
  
      buttons.forEach((button) => {
        if (!button.hasAttribute('aria-label')) {
          button.setAttribute('aria-label', 'Close modal'); 
        }
      });
    };
  
    // runs it initiailly
    fixEmptyButtons();
  
    const observer = new MutationObserver(() => {
      fixEmptyButtons();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    return () => observer.disconnect();
  }, []);

  // fix broken aria menu
  useEffect(() => {
    const fixAriaMenus = () => {
      const problematicMenus = document.querySelectorAll('ul.awsui_options-list_19gcf_1hl2l_141');
  
      problematicMenus.forEach((menu) => {
        if (menu.getAttribute('role') === 'menu') {
          menu.removeAttribute('role');
        }
      });
    };
  
    // runs this initally
    fixAriaMenus();
  
    const observer = new MutationObserver(() => {
      fixAriaMenus();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    return () => {
      observer.disconnect();
    };
  }, []);

  // make table accessible by adding text to checkbox column
  useEffect(() => {
    const updateLabels = () => {
      // select all labels of checkbox inputs
      const labels = document.querySelectorAll('label.awsui_label_1s55x_1iop1_145');
  
      labels.forEach((label, index) => {
        const labelElement = label as HTMLLabelElement;
        const checkbox = label.querySelector('input[type="radio"]'); // finds radio input under label tag
    
        if (checkbox instanceof HTMLInputElement) {
          // add a span of hidden text
          let hiddenSpan = label.querySelector('.hidden-span') as HTMLSpanElement;
          if (!hiddenSpan) {
            hiddenSpan = document.createElement('span');
            hiddenSpan.className = 'hidden-span';
            hiddenSpan.innerText = checkbox.checked
              ? `Unselect row ${index + 1}`
              : `Select row ${index + 1}`;
  
            hiddenSpan.style.position = 'absolute';
            hiddenSpan.style.width = '1px';
            hiddenSpan.style.height = '1px';
            hiddenSpan.style.padding = '0';
            hiddenSpan.style.margin = '-1px';
            hiddenSpan.style.overflow = 'hidden';
            hiddenSpan.style.whiteSpace = 'nowrap';
            hiddenSpan.style.border = '0';
  
            labelElement.appendChild(hiddenSpan);
          }
  
          // handles checkbox status changes
          const onChangeHandler = () => {
            if (index === 0) {
              hiddenSpan.innerText = checkbox.checked
                ? `Unselect all rows`
                : `Select all rows`;
            } else {
              hiddenSpan.innerText = checkbox.checked
                ? `Unselect row ${index + 1}`
                : `Select row ${index + 1}`;
            }
          };
  
          if (!checkbox.dataset.listenerAdded) {
            checkbox.addEventListener('change', onChangeHandler);
            checkbox.dataset.listenerAdded = 'true';
          }
        }
      });
    };
  
    // first call
    updateLabels();
  
    // monitor changes to table (table items render after the header does)
    const table = document.querySelector('table');
    if (table) {
      const observer = new MutationObserver(() => {
        console.log('Mutation detected, updating labels');
        updateLabels();
      });
  
      observer.observe(table, {
        childList: true,
        subtree: true,
      });
  
      return () => observer.disconnect();
    }
  }, []);

  // add text to header column for radio inputs
  useEffect(() => {
    const btn = document.querySelector('th.awsui_header-cell_1spae_r2f6t_145');
    
    if (btn) {
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = 'Selection';
  
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

  // add text to footer icon that expands the feedback view piece
  useEffect(() => {
    const div = document.querySelector('div.awsui_header-actions_1r9lg_189so_413');
    const btn = div?.querySelector('button');
    
    if (btn) {
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = 'Toggle expanded selected feedback view';
  
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

  const { addNotification, removeNotification } = useNotifications();

  const { items, collectionProps, paginationProps } = useCollection(pages, {
    filtering: {
      empty: (
        <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>No feedback</b>
          </SpaceBetween>
        </Box>
      ),
    },
    pagination: { pageSize: 5 },
    sorting: {
      defaultState: {
        sortingColumn: {
          sortingField: "FeedbackID",
        },
        isDescending: true,
      },
    },
    selection: {},
  });

  const getFeedback = useCallback(
    async (params: { pageIndex?, nextPageToken?}) => {
      setLoading(true);
      try {
        // console.log(selectedOption);
        // console.log(value);
        const result = await apiClient.userFeedback.getUserFeedback(selectedOption.value, value.startDate, value.endDate, params.nextPageToken)
        // console.log(result);
        setPages((current) => {
          if (needsRefresh.current) {
            // console.log("needed a refresh!")
            needsRefresh.current = false;
            return [result];
          }
          if (typeof params.pageIndex !== "undefined") {
            current[params.pageIndex - 1] = result;
            return [...current];
          } else {
            console.log("pages?")
            return [...current, result];
          }
        });
      } catch (error) {
        console.error(Utils.getErrorMessage(error));
      }

      console.log(pages);
      setLoading(false);
    },
    [appContext, selectedOption, value, needsRefresh]
  );


  useEffect(() => {
    setCurrentPageIndex(1);    
    setSelectedItems([]);
    if (needsRefresh.current) {
      // console.log("needs refresh!")
      getFeedback({ pageIndex: 1 });      
    } else { 
      getFeedback({ pageIndex: currentPageIndex }); 
    }
  }, [getFeedback]);

  const onNextPageClick = async () => {
    // console.log(pages);
    const continuationToken = pages[currentPageIndex - 1]?.NextPageToken;
    // console.log("next page", currentPageIndex)
    // console.log(pages);
    if (continuationToken) {
      if (pages.length <= currentPageIndex || needsRefresh.current) {
        await getFeedback({ nextPageToken: continuationToken });
      }
      setCurrentPageIndex((current) => Math.min(pages.length + 1, current + 1));
    }
  };


  const onPreviousPageClick = async () => {
    // console.log("prev page", currentPageIndex)
    // console.log(pages);
    setCurrentPageIndex((current) =>
      Math.max(1, Math.min(pages.length - 1, current - 1))
    );
  };

  const refreshPage = async () => {
    // console.log(pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Contents!)

    if (currentPageIndex <= 1) {
      await getFeedback({ pageIndex: currentPageIndex });
    } else {
      const continuationToken = pages[currentPageIndex - 2]?.NextPageToken!;
      await getFeedback({ pageIndex: currentPageIndex, nextPageToken: continuationToken });
    }
  };


  const columnDefinitions = [
    {
      id: "problem",
      header: "Problem",
      cell: (item) => {
        return item.Problem.length > 0
          ? item.Problem
          : "No problem specified";
      },
      isRowHeader: true,
    },
    {
      id: "topic",
      header: "Topic",
      cell: (item) => item.Topic,
      isRowHeader: true,
    },
    {
      id: "createdAt",
      header: "Submission date",
      cell: (item) =>
        DateTime.fromISO(new Date(item.CreatedAt).toISOString()).toLocaleString(
          DateTime.DATETIME_SHORT
        ),
    },
    {
      id: "prompt",
      header: "User Prompt",
      cell: (item) => item.UserPrompt,
      isRowHeader: true
    },

  ];
  //getColumnDefinition(props.documentType);

  const deleteSelectedFeedback = async () => {
    if (!appContext) return;

    setLoading(true);
    setShowModalDelete(false);
    const apiClient = new ApiClient(appContext);
    await Promise.all(
      selectedItems.map((s) => apiClient.userFeedback.deleteFeedback(s.Topic, s.CreatedAt))
    );
    await getFeedback({ pageIndex: currentPageIndex });
    setSelectedItems([])
    setLoading(false);
  };



  return (
    <>
      <Modal
      onDismiss={() => setShowModalDelete(false)}
      visible={showModalDelete}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {" "}
            <Button variant="link" onClick={() => setShowModalDelete(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={deleteSelectedFeedback}>
              Ok
            </Button>
          </SpaceBetween>{" "}
        </Box>
      }
      header={"Delete feedback" + (selectedItems.length > 1 ? "s" : "")}
    >
      Do you want to delete{" "}
      {selectedItems.length == 1
        ? `Feedback ${selectedItems[0].FeedbackID!}?`
        : `${selectedItems.length} Feedback?`}
    </Modal>
      <I18nProvider locale="en" messages={[messages]}>


        <Table
          {...collectionProps}
          loading={loading}
          loadingText={`Loading Feedback`}
          columnDefinitions={columnDefinitions}
          selectionType="single"
          onSelectionChange={({ detail }) => {
            // console.log(detail);
            // needsRefresh.current = true;
            props.updateSelectedFeedback(detail.selectedItems[0])
            setSelectedItems(detail.selectedItems);
          }}
          selectedItems={selectedItems}
          items={pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Items!}
          trackBy="FeedbackID"
          header={
            <Header
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <DateRangePicker
                    onChange={({ detail }) => {
                      // console.log(detail);
                      setValue(detail.value as DateRangePickerProps.AbsoluteValue)
                    }}
                    value={value as DateRangePickerProps.AbsoluteValue}
                    relativeOptions={[
                      {
                        key: "previous-5-minutes",
                        amount: 5,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-30-minutes",
                        amount: 30,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-1-hour",
                        amount: 1,
                        unit: "hour",
                        type: "relative"
                      },
                      {
                        key: "previous-6-hours",
                        amount: 6,
                        unit: "hour",
                        type: "relative"
                      }
                    ]}
                    
                    isValidRange={range => {
                      if (range.type === "absolute") {
                        const [
                          startDateWithoutTime
                        ] = range.startDate.split("T");
                        const [
                          endDateWithoutTime
                        ] = range.endDate.split("T");
                        if (
                          !startDateWithoutTime ||
                          !endDateWithoutTime
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is incomplete. Select a start and end date for the date range."
                          };
                        }
                        if (
                          +new Date(range.startDate) - +new Date(range.endDate) > 0
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is invalid. The start date must be before the end date."
                          };
                        }
                      }
                      return { valid: true };
                    }}
                    i18nStrings={{}}
                    placeholder="Filter by a date and time range"
                    showClearButton={false}
                    timeInputFormat="hh:mm:ss"
                    rangeSelectorMode="absolute-only"
                  />
                  {/* <FormField label="Filter Topic"> */}
                    <Select
                      selectedOption={selectedOption}
                      onChange={({ detail }) => {
                        // Ensure label and value are defined, or set default
                        const label = detail.selectedOption.label ?? "Default Label";
                        const value = detail.selectedOption.value ?? "Default Value";
                        // console.log(detail);
                        needsRefresh.current = true;
                        setSelectedOption({ label: detail.selectedOption.label!, value: detail.selectedOption.value, disabled: false });
                        // setTopic(detail.selectedOption.value); 
                      }}
                      
                      options={[...feedbackCategories, {label : "Any", value: "any", disabled: false}]}
                    />
                  {/* </FormField> */}

                  <Button iconName="refresh" onClick={refreshPage} aria-label="Refresh feedback" />
                  <Button 
                variant="primary"
                onClick={() => {
                  apiClient.userFeedback.downloadFeedback(selectedOption.value, value.startDate, value.endDate);
                  const id = addNotification("success","Your files have been downloaded.")
                  Utils.delay(3000).then(() => removeNotification(id));
                }}
                >Download</Button>
                  <Button
                    variant="primary"
                    disabled={selectedItems.length == 0}
                    onClick={() => {
                      if (selectedItems.length > 0) setShowModalDelete(true);
                    }}
                    data-testid="submit">
                    Delete
                  </Button>
                </SpaceBetween>
              }
              description="Please expect a delay for your changes to be reflected. Press the refresh button to see the latest changes."
            >
              {"Feedback"}
            </Header>
          }
          empty={
            /*<TableEmptyState
              resourceName={"Feedback"}
              // createHref={`/rag/workspaces/add-data?workspaceId=${props.workspaceId}&tab=${props.documentType}`}
              // createHref={`/admin/add-data`}
              // createText={"Add Feedback"}
            />*/
            <Box textAlign="center">No more feedback</Box>
          }
          pagination={
            pages.length === 0 ? null : (
              <Pagination
                openEnd={true}
                pagesCount={pages.length}
                currentPageIndex={currentPageIndex}
                onNextPageClick={onNextPageClick}
                onPreviousPageClick={onPreviousPageClick}
              />
            )
          }
        />
      </I18nProvider>
    </>


  );
}
