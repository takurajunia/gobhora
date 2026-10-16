CREATE TABLE "leagues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "leagues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
