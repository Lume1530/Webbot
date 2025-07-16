ALTER TABLE public.users ADD otp varchar(6) NULL;

ALTER TABLE public.users ADD otp_expires_at timestamptz NULL;

ALTER TABLE public.users ADD referral_code varchar(32) NULL;

ALTER TABLE public.users ADD referred_by int4 NULL;

-- public.referral_claims definition

-- Drop table

-- DROP TABLE public.referral_claims;

CREATE TABLE public.referral_claims (
	id serial4 NOT NULL,
	referrer_id int4 NOT NULL,
	status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
	request_date timestamptz DEFAULT now() NULL,
	approval_date timestamptz NULL,
	approved_by int4 NULL,
	rejection_reason text NULL,
	CONSTRAINT referral_claims_pkey PRIMARY KEY (id),
	CONSTRAINT referral_claims_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


-- public.referral_earnings definition

-- Drop table

-- DROP TABLE public.referral_earnings;

CREATE TABLE public.referral_earnings (
	id serial4 NOT NULL,
	referrer_id int4 NOT NULL,
	referred_id int4 NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	earned_amount numeric(10, 2) NULL,
	claimed_amount numeric(10, 2) NULL,
	campaign_id int4 NULL,
	status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
	CONSTRAINT referral_earnings_pkey PRIMARY KEY (id)
);


-- public.referral_claims foreign keys

ALTER TABLE public.referral_claims ADD CONSTRAINT referral_claims_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.referral_claims ADD CONSTRAINT referral_claims_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- public.referral_earnings foreign keys

ALTER TABLE public.referral_earnings ADD CONSTRAINT referral_earnings_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);
ALTER TABLE public.referral_earnings ADD CONSTRAINT referral_earnings_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.referral_earnings ADD CONSTRAINT referral_earnings_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;
