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
