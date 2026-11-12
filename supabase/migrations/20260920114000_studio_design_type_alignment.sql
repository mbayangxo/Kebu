alter table public.create_designs
  drop constraint if exists create_designs_design_type_check;

alter table public.create_designs
  add constraint create_designs_design_type_check
  check (
    design_type = any (
      array[
        'poster'::text,
        'social_square'::text,
        'flyer'::text,
        'instagram_post'::text,
        'instagram_story'::text,
        'facebook_post'::text,
        'whatsapp_status'::text,
        'banner'::text,
        'business_card'::text
      ]
    )
  );