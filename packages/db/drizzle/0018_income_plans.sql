CREATE TABLE "income_plan_allocations" (
	"plan_id" uuid NOT NULL,
	"area_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	CONSTRAINT "income_plan_allocations_plan_id_area_id_pk" PRIMARY KEY("plan_id","area_id"),
	CONSTRAINT "income_plan_allocations_amount_nonnegative_check" CHECK ("income_plan_allocations"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "income_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"income_amount" numeric(12, 2) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "income_plans_income_amount_nonnegative_check" CHECK ("income_plans"."income_amount" >= 0),
	CONSTRAINT "income_plans_period_format_check" CHECK ("income_plans"."period" ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
CREATE TABLE "spending_area_categories" (
	"area_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "spending_area_categories_area_id_category_id_pk" PRIMARY KEY("area_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "spending_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(20) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "income_plans_user_id_period_unique" ON "income_plans" USING btree ("user_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "income_plans_id_user_id_unique" ON "income_plans" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_area_categories_user_id_category_id_unique" ON "spending_area_categories" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_areas_user_id_name_unique" ON "spending_areas" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_areas_id_user_id_unique" ON "spending_areas" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "income_plan_allocations" ADD CONSTRAINT "income_plan_allocations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_plan_allocations" ADD CONSTRAINT "income_plan_allocations_plan_id_user_id_fk" FOREIGN KEY ("plan_id","user_id") REFERENCES "public"."income_plans"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_plan_allocations" ADD CONSTRAINT "income_plan_allocations_area_id_user_id_fk" FOREIGN KEY ("area_id","user_id") REFERENCES "public"."spending_areas"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_plans" ADD CONSTRAINT "income_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spending_area_categories" ADD CONSTRAINT "spending_area_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spending_area_categories" ADD CONSTRAINT "spending_area_categories_area_id_user_id_fk" FOREIGN KEY ("area_id","user_id") REFERENCES "public"."spending_areas"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spending_area_categories" ADD CONSTRAINT "spending_area_categories_category_id_user_id_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spending_areas" ADD CONSTRAINT "spending_areas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
