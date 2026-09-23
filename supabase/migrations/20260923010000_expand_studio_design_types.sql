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
        'instagram_reel'::text,
        'tiktok_vertical'::text,
        'youtube_thumbnail'::text,
        'youtube_banner'::text,
        'spotify_artist_header'::text,
        'press_kit'::text,
        'media_kit'::text,
        'brand_deck'::text,
        'pitch_deck'::text,
        'lookbook'::text,
        'packaging'::text,
        'logo'::text,
        'email_graphic'::text,
        'facebook_post'::text,
        'whatsapp_status'::text,
        'banner'::text,
        'business_card'::text
      ]
    )
  );
