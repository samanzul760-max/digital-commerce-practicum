# Student server-source contract

Feature ID: `BDD-STUDENT-SERVER-SOURCE-001`

## Scenario: clearing browser business state does not hide a server submission

Given the server has a published practice activity and a submitted student version
When the student clears browser business state and requests the activity submission again
Then the server response still contains the submitted version and its immutable version number

## Scenario: returning a submission requires feedback and survives refresh

Given the server has a submitted student version
When an authorized reviewer returns it without feedback
Then the server responds with an error and does not change the submission status
When the reviewer returns it with feedback
Then the server marks it `RETURNED` and stores the feedback
When the student refreshes the submission request
Then the returned status and feedback are still present

## Scenario: resubmission increments an immutable version

Given the server has returned version 1 with reviewer feedback
When the student submits revised content
Then the server creates version 2
And version 1 remains unchanged
When the student refreshes the submission request
Then both immutable versions and the feedback for version 1 remain present

## Scenario: an unauthorized role cannot read or mutate a student submission

Given the server has a submission owned by a student in the training-room scope
Permission: a non-owner reviewer role is outside the submission read and mutation permission
When that role requests the submission
Then the server responds with `403`
When that role tries to return the submission
Then the server responds with `403` and the submission remains unchanged
Error: the forbidden response must not expose submission content

## Scenario: student task context and feedback survive a refresh

Given the current student has a published task, a returned submission, and a released grade
And the task history contains more than one `RETURNED` event
When the student requests the task list or task detail after refreshing the page
Then the response contains the task `planId` and identifiable activity context
And the detail contains only the latest returned feedback
And the detail contains the current released grade score and feedback
And the response does not expose another student's task, feedback, or grade

## Scenario: assigned task loses access when current teaching scope is invalid

Given a StudentTask still points to the current student
And the student's task class enrollment is inactive, missing, or no longer a STUDENT enrollment
When the student refreshes task lists or directly calls task read and write endpoints
Then lists omit the task and direct requests return `404`
And an active enrollment in another class in the same training room does not restore access

## Scenario: class, training room, and organization chain must remain consistent

Given a StudentTask still points to the current student and the class enrollment is active
But the task class is outside the user's current room scope or the class organization differs from the training room organization
When the student reads, starts, saves, records events, submits, or loads compatibility learning state
Then every endpoint denies access without revealing that the task exists

## Scenario: software progress and training attempts survive refresh

Given the current student has an available task linked to a published software or training activity
When the student saves only configured software steps or submits a training answer
Then the server validates required steps and the configured attempt limit before storing a TaskEvent
And refreshing returns the latest software completion state or every training attempt with deterministic feedback
And another student cannot read or write that learning state
