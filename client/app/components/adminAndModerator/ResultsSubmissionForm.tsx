'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import myFetch from '~/helpers/myFetch';
import ResultForm from '@c/adminAndModerator/ResultForm';
import Loading from '@c/UI/Loading';
import Form from '@c/form/Form';
import FormCheckbox from '@c/form/FormCheckbox';
import FormDateInput from '@c/form/FormDateInput';
import FormTextInput from '@c/form/FormTextInput';
import Button from '@c/UI/Button';
import CreatorDetails from '@c/CreatorDetails';
import { IAttempt, IEvent, IPerson, IResult, IResultsSubmissionInfo, IUpdateResultDto } from '@sh/types';
import { RoundFormat } from '@sh/enums';
import { roundFormats } from '@sh/roundFormats';
import C from '@sh/constants';
import { checkErrorsBeforeResultSubmission, getUserInfo, limitRequests } from '~/helpers/utilityFunctions';
import { IUserInfo } from '~/helpers/interfaces/UserInfo';

const userInfo: IUserInfo = getUserInfo();

/**
 * If resultId is defined, that means this component is for submitting new results.
 * Otherwise it's for editing an existing result (admin-only feature).
 */

const ResultsSubmissionForm = ({ resultId }: { resultId?: string }) => {
  if (resultId && !userInfo.isAdmin) throw new Error('Only an admin can edit results');

  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState<IResultsSubmissionInfo>();
  // Only trigger reset on page load on the submit results page
  const [resultFormResetTrigger, setResultFormResetTrigger] = useState<boolean>(resultId ? undefined : true);
  const [fetchRecordPairsTimer, setFetchRecordPairsTimer] = useState<NodeJS.Timeout>(null);
  const [loadingId, setLoadingId] = useState('');

  const [event, setEvent] = useState<IEvent>();
  const [roundFormat, setRoundFormat] = useState(RoundFormat.BestOf1);
  const [attempts, setAttempts] = useState<IAttempt[]>([]);
  // null means the date is invalid; undefined means it's empty
  const [date, setDate] = useState<Date | null | undefined>();
  const [competitors, setCompetitors] = useState<IPerson[]>([null]);
  const [videoLink, setVideoLink] = useState('');
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [discussionLink, setDiscussionLink] = useState('');

  const searchParams = useSearchParams();

  const recordPairs = useMemo(
    () => submissionInfo?.recordPairsByEvent.find((el) => el.eventId === event.eventId)?.recordPairs,
    [submissionInfo, event],
  );

  useEffect(() => {
    // If submitting results
    if (!resultId) {
      myFetch
        .get(`/results/submission-info/${new Date()}`, { authorize: true })
        .then(({ payload, errors }: { payload?: IResultsSubmissionInfo; errors?: string[] }) => {
          if (errors) {
            setErrorMessages(errors);
          } else {
            setSubmissionInfo(payload);

            const event = payload.events.find((el: IEvent) => el.eventId === searchParams.get('eventId'));
            if (event) setEvent(event);
            else setEvent(payload.events[0]);
          }
        });
    }
    // If editing a result
    else {
      myFetch.get(`/results/editing-info/${resultId}`, { authorize: true }).then(({ payload, errors }) => {
        if (errors) {
          setErrorMessages(errors);
        } else {
          setSubmissionInfo(payload);
          const { result, persons, events } = payload as IResultsSubmissionInfo;

          setEvent(events[0]);
          setRoundFormat(
            roundFormats.find((rf) => rf.attempts === result.attempts.length && rf.value !== RoundFormat.BestOf3).value,
          );
          setAttempts(result.attempts);
          setDate(new Date(result.date));
          setCompetitors(persons);
          setVideoLink(result.videoLink);
          if (result.discussionLink) setDiscussionLink(result.discussionLink);
        }
      });
    }
  }, []);

  // Scroll to the top of the page when a new error message is shown
  useEffect(() => {
    if (successMessage || errorMessages.length > 0) window.scrollTo(0, 0);
  }, [errorMessages, successMessage]);

  //////////////////////////////////////////////////////////////////////////////
  // FUNCTIONS
  //////////////////////////////////////////////////////////////////////////////

  const submitResult = async (approve = false) => {
    const newResult: IResult = {
      eventId: event.eventId,
      date,
      personIds: competitors.map((el) => el?.personId || null),
      attempts,
      best: -1,
      average: -1,
      videoLink: videoUnavailable ? '' : videoLink,
      discussionLink: discussionLink || undefined,
    };

    if (submissionInfo.result?.unapproved && !approve) newResult.unapproved = true;

    checkErrorsBeforeResultSubmission(
      newResult,
      event,
      competitors,
      setErrorMessages,
      setSuccessMessage,
      async (newResultWithBestAndAverage) => {
        setLoadingId(approve ? 'approve_button' : 'submit_button');

        if (!resultId) {
          const { errors } = await myFetch.post('/results', newResultWithBestAndAverage);

          if (errors) {
            setErrorMessages(errors);
          } else {
            setSuccessMessage('Result successfully submitted');
            setDate(undefined);
            setVideoLink('');
            setDiscussionLink('');
            setResultFormResetTrigger(!resultFormResetTrigger);
          }

          setLoadingId('');
        } else {
          const updateResultDto: IUpdateResultDto = {
            date: newResultWithBestAndAverage.date,
            unapproved: newResultWithBestAndAverage.unapproved,
            personIds: newResultWithBestAndAverage.personIds,
            attempts: newResultWithBestAndAverage.attempts,
            videoLink: newResultWithBestAndAverage.videoLink,
            discussionLink: newResultWithBestAndAverage.discussionLink,
          };
          const { errors } = await myFetch.patch(`/results/${resultId}`, updateResultDto);

          if (errors) {
            setErrorMessages(errors);
            setLoadingId('');
          } else {
            setSuccessMessage(approve ? 'Result approved' : 'Result updated');

            setTimeout(() => {
              window.location.href = '/admin/results';
            }, 1000);
          }
        }
      },
      { roundFormat },
    );
  };

  const changeDate = (newDate: Date) => {
    setErrorMessages([]);
    setSuccessMessage('');
    setDate(newDate);

    // Update the record pairs with the new date
    if (newDate) {
      limitRequests(fetchRecordPairsTimer, setFetchRecordPairsTimer, async () => {
        const eventsStr = submissionInfo.events.map((e) => e.eventId).join(',');
        const queryParams = resultId ? `?excludeResultId=${resultId}` : '';

        const { payload, errors } = await myFetch.get(`/results/record-pairs/${newDate}/${eventsStr}${queryParams}`, {
          authorize: true,
        });

        if (errors) setErrorMessages(errors);
        else setSubmissionInfo({ ...submissionInfo, recordPairsByEvent: payload });
      });
    }
  };

  const changeVideoLink = (newValue: string) => {
    let newVideoLink: string;

    // Remove unnecessary params from youtube links
    if (newValue.includes('youtube.com') && newValue.includes('&')) {
      newVideoLink = newValue.split('&')[0];
    } else if (newValue.includes('youtu.be') && newValue.includes('?')) {
      newVideoLink = newValue.split('?')[0];
    } else {
      newVideoLink = newValue;
    }

    setVideoLink(newVideoLink);
  };

  if (submissionInfo) {
    return (
      <div>
        <h2 className="text-center">{resultId ? 'Edit Result' : 'Submit Result'}</h2>

        <div className="mt-3 mx-auto px-3 fs-6" style={{ maxWidth: '900px' }}>
          {resultId ? (
            <p>
              Once you submit the attempt, the backend will remove future records that would have been cancelled by it.
            </p>
          ) : (
            <>
              <p>
                Here you can submit results for events that allow submissions. They will be included in the rankings
                after an admin approves them. A result can only be accepted if it has video evidence of the{' '}
                <b>ENTIRE</b> solve (including memorization, if applicable). The video date is used as proof of when the
                solve was done, an earlier date cannot be used. Make sure that you can be identified from the provided
                video; if your channel name is not your real name, please include your full name or WCA ID in the
                description of the video. If you have any questions or suggestions, feel free to send an email to{' '}
                {C.contactEmail}.
              </p>
              <button type="button" className="btn btn-success btn-sm" onClick={() => setShowRules(!showRules)}>
                {showRules ? 'Hide rules' : 'Show rules'}
              </button>
              {showRules && (
                <div className="mt-4">
                  <p>
                    1. For blindfolded events, your face must be visible during the entire solve (it must be visible
                    that your mask is on during the solving phase).
                  </p>
                  <p>
                    2. The final time must be visible at the end of the video with no cuts after the end of the solve.
                    Having the time always visible is preferable.
                  </p>
                  <p>
                    3. For team events, every participant must use a different scramble, be in the same place, not touch
                    the puzzle while waiting for other participants (penalty: +2), and be visible on video at the same
                    time (an exception can be made for team events with 5+ participants). Penalty for an early start:
                    +2.
                  </p>
                  <p>4. If you're submitting a Mean of 3, there must be no cuts between the solves.</p>
                  <p>*. Bonus points if it's visible that a new scramble was generated and applied.</p>
                </div>
              )}
            </>
          )}
        </div>

        <Form errorMessages={errorMessages} successMessage={successMessage} hideButton>
          <ResultForm
            event={event}
            persons={competitors}
            setPersons={setCompetitors}
            attempts={attempts}
            setAttempts={setAttempts}
            recordPairs={recordPairs}
            loadingRecordPairs={fetchRecordPairsTimer !== null}
            recordTypes={submissionInfo.activeRecordTypes}
            nextFocusTargetId="date"
            resetTrigger={resultFormResetTrigger}
            setErrorMessages={setErrorMessages}
            setSuccessMessage={setSuccessMessage}
            setEvent={setEvent}
            events={submissionInfo.events}
            roundFormat={roundFormat}
            setRoundFormat={setRoundFormat}
            disableMainSelects={!!resultId}
            showOptionToKeepCompetitors
            isAdmin={userInfo.isAdmin}
            forResultsSubmissionForm
          />
          <FormDateInput
            id="date"
            title="Date (dd.mm.yyyy)"
            value={date}
            setValue={changeDate}
            disabled={!submissionInfo.result.unapproved}
            nextFocusTargetId={videoUnavailable ? 'discussion_link' : 'video_link'}
          />
          <FormTextInput
            id="video_link"
            title="Link to video"
            placeholder="E.g: https://youtube.com/watch?v=xyz"
            value={videoLink}
            setValue={changeVideoLink}
            nextFocusTargetId="discussion_link"
            disabled={videoUnavailable}
          />
          {userInfo.isAdmin && (
            // Same text as in RankingLinks
            <FormCheckbox
              title="Video no longer available"
              selected={videoUnavailable}
              setSelected={setVideoUnavailable}
            />
          )}
          {resultId && videoLink && (
            <a href={videoLink} target="_blank" className="d-block mb-3">
              Video link
            </a>
          )}
          <FormTextInput
            id="discussion_link"
            title="Link to discussion (optional)"
            placeholder="E.g: https://speedsolving.com/threads/xyz"
            value={discussionLink}
            setValue={setDiscussionLink}
            nextFocusTargetId="submit_button"
          />
          {resultId && discussionLink && (
            <a href={discussionLink} target="_blank" className="d-block">
              Discussion link
            </a>
          )}
          {resultId && (
            <div className="d-flex flex-wrap gap-3 mt-4">
              <span>Created by:</span>
              <CreatorDetails creator={submissionInfo.creator} />
            </div>
          )}
          <Button
            id="submit_button"
            text="Submit"
            onClick={() => submitResult()}
            loadingId={loadingId}
            disabled={fetchRecordPairsTimer !== null}
            className="mt-3"
          />
          {resultId && submissionInfo.result.unapproved && (
            <Button
              id="approve_button"
              text="Submit and approve"
              onClick={() => submitResult(true)}
              loadingId={loadingId}
              disabled={fetchRecordPairsTimer !== null}
              className="btn-success mt-3 ms-3"
            />
          )}
        </Form>
      </div>
    );
  }

  return <Loading errorMessages={errorMessages} />;
};

export default ResultsSubmissionForm;
