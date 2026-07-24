export type PracticumRole = 'OWNER' | 'STUDENT'
export type PlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type ActivityType = 'SOFTWARE_ACTION' | 'TRAINING' | 'PRACTICE_ACTIVITY'
export type SubmissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'GRADED'
export type ReviewScope = 'PLAN' | 'CLASSROOM'

export interface TrainingRoom {
  id: string
  title: string
  description: string
  organizationId: string
  planIds: string[]
  status: 'ONLINE' | 'OFFLINE' | 'ENDED'
  promotionalMediaUrl?: string
}

export interface Plan {
  id: string
  roomId: string
  title: string
  description: string
  status: PlanStatus
  sort: number
  moduleIds: string[]
  resourceIds?: string[]
  createdAt: string
  updatedAt: string
}

export type ResourceKind = 'LINK' | 'DOCUMENT' | 'VIDEO'

export interface SupportingResource {
  id: string
  planId: string
  name: string
  kind: ResourceKind
  url: string
}

export interface PrototypeMember {
  id: string
  label: string
  role: 'OWNER' | 'STUDENT'
  group: string
}

export interface CurriculumNode {
  id: string
  planId: string
  parentId: string | null
  level: 1 | 2 | 3
  title: string
  description: string
  sort: number
  activityId?: string
  activityType?: ActivityType
}

export interface Activity {
  id: string
  type: ActivityType
  title: string
  objective: string
  instructions: string[]
  required: boolean
  resourceIds: string[]
  rubricId?: string
  config: SoftwareConfig | TrainingConfig | PracticeConfig
}

export interface SoftwareConfig {
  type: 'SOFTWARE_ACTION'
  steps: SoftwareStep[]
}

export interface SoftwareStep {
  id: string
  label: string
  required: boolean
}

export interface SoftwareAttempt {
  completedStepIds: string[]
  completedAt?: string
  updatedAt: string
}

export interface TrainingConfig {
  type: 'TRAINING'
  maxAttempts: number
  timeLimitMinutes?: number
}

export interface TrainingAttempt {
  answer: string
  feedback: string
  submittedAt: string
}

export interface PracticeConfig {
  type: 'PRACTICE_ACTIVITY'
  deliverables: string[]
  rubric: RubricDimension[]
}

export interface RubricDimension {
  id: string
  label: string
  maxScore: number
  required: boolean
}

export interface AttachmentMetadata {
  id: string
  name: string
  sizeBytes: number
  mimeType: string
}

export interface SubmissionVersion {
  id: string
  submissionId: string
  version: number
  text: string
  links: string[]
  attachments: AttachmentMetadata[]
  submittedAt: string
}

export interface PracticeSubmissionState {
  status: SubmissionStatus
  versions: SubmissionVersion[]
  feedback?: string
  feedbackEntries?: FeedbackEntry[]
  studentId?: string
  studentLabel?: string
  grade?: Grade
  reviewScope?: ReviewScope
}

export interface ReviewQueueItem {
  submissionId: string
  studentId: string
  studentLabel: string
  planId: string
  planTitle: string
  unitId: string
  unitTitle: string
  activityId: string
  activityTitle: string
  version: number
  submittedAt: string
  status: SubmissionStatus
  reviewScope: ReviewScope
}

export interface SubmissionDraft {
  text: string
  links: string[]
  attachments: AttachmentMetadata[]
}

export interface FeedbackEntry {
  id: string
  authorId: string
  authorRole: PracticumRole
  text: string
  version: number
  rubricScores?: Record<string, number>
  createdAt: string
}

export interface Grade {
  reviewerId: string
  rubricScores: Record<string, number>
  feedback: string
  createdAt: string
}

export interface Submission {
  id: string
  activityId: string
  studentId: string
  status: SubmissionStatus
  draft: SubmissionDraft
  versionIds: string[]
  feedbackEntries: FeedbackEntry[]
  grade?: Grade
}

export type NotificationType = 'PLAN_PUBLISHED' | 'WORK_RETURNED' | 'WORK_GRADED' | 'DEADLINE_APPROACHING' | 'NEW_SUBMISSION'

export interface PracticumNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  targetRole: PracticumRole
  targetRoute: string
  read: boolean
  createdAt: string
}

export type CommerceCaseSubmissionMode = 'READ_ONLY' | 'SUBMITTABLE'

export interface CommerceCaseRubricItem {
  id: string
  label: string
  maxScore: number
  required: boolean
}

export interface CommerceTeachingCase {
  id: string
  title: string
  category: string
  summary: string
  scenario: string
  learningObjectives: string[]
  studentTask: string
  steps: string[]
  example: string
  selfCheckItems: string[]
  ownerGuidance: string[]
  classroomTips: string[]
  commonMistakes: string[]
  submissionMode: CommerceCaseSubmissionMode
  submissionNodeId?: string
  rubric: CommerceCaseRubricItem[]
}
