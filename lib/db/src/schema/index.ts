import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  projects: many(projects),
}));

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true });
export type InsertOrganization = typeof organizations.$inferInsert;
export type Organization = typeof organizations.$inferSelect;

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'gestionale' | 'landing' | 'workflow' | 'video_ideas'
  description: text("description"),
  status: text("status").notNull().default("draft"),
  config: jsonb("config").default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  conversations: many(conversations),
  workflows: many(workflows),
  gestionaleSchemas: many(gestionaleSchemas),
  landingConfigs: many(landingConfigs),
  videoProfiles: many(videoProfiles),
  videoIdeas: many(videoIdeas),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  project: one(projects, { fields: [conversations.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [conversations.orgId], references: [organizations.id] }),
  messages: many(chatMessages),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export type InsertConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  agentRole: text("agent_role"), // 'pm' | 'architect' | 'executor'
  modelUsed: text("model_used"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costUsd: text("cost_usd"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, { fields: [chatMessages.conversationId], references: [conversations.id] }),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============================================================================
// WORKFLOWS
// ============================================================================

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").default([]),
  edges: jsonb("edges").default([]),
  isActive: boolean("is_active").default(false).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  project: one(projects, { fields: [workflows.projectId], references: [projects.id] }),
  runs: many(workflowRuns),
}));

export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true });
export type InsertWorkflow = typeof workflows.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;

// ============================================================================
// WORKFLOW RUNS
// ============================================================================

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("running"),
  currentNodeId: text("current_node_id"),
  context: jsonb("context").default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { mode: "string" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "string" }),
});

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] }),
  approvals: many(pendingApprovals),
}));

export const insertWorkflowRunSchema = createInsertSchema(workflowRuns).omit({ id: true });
export type InsertWorkflowRun = typeof workflowRuns.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;

// ============================================================================
// PENDING APPROVALS (Human-in-the-Loop)
// ============================================================================

export const pendingApprovals = pgTable("pending_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => workflowRuns.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  displayData: jsonb("display_data").default({}),
  actions: jsonb("actions").notNull(),
  status: text("status").notNull().default("pending"),
  resolvedBy: text("resolved_by"),
  resolvedAction: text("resolved_action"),
  timeoutAt: timestamp("timeout_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
});

export const pendingApprovalsRelations = relations(pendingApprovals, ({ one }) => ({
  run: one(workflowRuns, { fields: [pendingApprovals.runId], references: [workflowRuns.id] }),
}));

export const insertPendingApprovalSchema = createInsertSchema(pendingApprovals).omit({ id: true });
export type InsertPendingApproval = typeof pendingApprovals.$inferInsert;
export type PendingApproval = typeof pendingApprovals.$inferSelect;

// ============================================================================
// GESTIONALE SCHEMAS
// ============================================================================

export const gestionaleSchemas = pgTable("gestionale_schemas", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  schemaJson: jsonb("schema_json").notNull(),
  isDeployed: boolean("is_deployed").default(false).notNull(),
  deployedAt: timestamp("deployed_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const gestionaleSchemasRelations = relations(gestionaleSchemas, ({ one }) => ({
  project: one(projects, { fields: [gestionaleSchemas.projectId], references: [projects.id] }),
}));

export const insertGestionaleSchemaSchema = createInsertSchema(gestionaleSchemas).omit({ id: true });
export type InsertGestionaleSchema = typeof gestionaleSchemas.$inferInsert;
export type GestionaleSchema = typeof gestionaleSchemas.$inferSelect;

// ============================================================================
// LANDING CONFIGS
// ============================================================================

export const landingConfigs = pgTable("landing_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  template: text("template").notNull(),
  sections: jsonb("sections").notNull(),
  forms: jsonb("forms").default([]),
  customDomain: text("custom_domain"),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedUrl: text("published_url"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const landingConfigsRelations = relations(landingConfigs, ({ one }) => ({
  project: one(projects, { fields: [landingConfigs.projectId], references: [projects.id] }),
}));

export const insertLandingConfigSchema = createInsertSchema(landingConfigs).omit({ id: true });
export type InsertLandingConfig = typeof landingConfigs.$inferInsert;
export type LandingConfig = typeof landingConfigs.$inferSelect;

// ============================================================================
// VIDEO PROFILES
// ============================================================================

export const videoProfiles = pgTable("video_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const videoProfilesRelations = relations(videoProfiles, ({ one }) => ({
  project: one(projects, { fields: [videoProfiles.projectId], references: [projects.id] }),
}));

export const insertVideoProfileSchema = createInsertSchema(videoProfiles).omit({ id: true });
export type InsertVideoProfile = typeof videoProfiles.$inferInsert;
export type VideoProfile = typeof videoProfiles.$inferSelect;

// ============================================================================
// VIDEO IDEAS
// ============================================================================

export const videoIdeas = pgTable("video_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  script: text("script").notNull(),
  cta: text("cta"),
  hashtags: jsonb("hashtags").default([]),
  caption: text("caption"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("idea"),
  estimatedDuration: integer("estimated_duration"),
  format: text("format"),
  trendSource: text("trend_source"),
  category: text("category").notNull().default("educational"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const videoIdeasRelations = relations(videoIdeas, ({ one }) => ({
  project: one(projects, { fields: [videoIdeas.projectId], references: [projects.id] }),
}));

export const insertVideoIdeaSchema = createInsertSchema(videoIdeas).omit({ id: true });
export type InsertVideoIdea = typeof videoIdeas.$inferInsert;
export type VideoIdea = typeof videoIdeas.$inferSelect;

// ============================================================================
// PROJECT LINKS (Cross-Project Connections)
// ============================================================================

export const projectLinks = pgTable("project_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceProjectId: uuid("source_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  targetProjectId: uuid("target_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  linkType: text("link_type").notNull(),
  fieldMapping: jsonb("field_mapping").default({}),
  config: jsonb("config").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const insertProjectLinkSchema = createInsertSchema(projectLinks).omit({ id: true });
export type InsertProjectLink = typeof projectLinks.$inferInsert;
export type ProjectLink = typeof projectLinks.$inferSelect;

// ============================================================================
// AI USAGE LOG
// ============================================================================

export const aiUsageLog = pgTable("ai_usage_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  agentRole: text("agent_role").notNull(),
  model: text("model").notNull(),
  tokensIn: integer("tokens_in").notNull(),
  tokensOut: integer("tokens_out").notNull(),
  costUsd: text("cost_usd").notNull(),
  contextType: text("context_type"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLog).omit({ id: true });
export type InsertAiUsageLog = typeof aiUsageLog.$inferInsert;
export type AiUsageLog = typeof aiUsageLog.$inferSelect;