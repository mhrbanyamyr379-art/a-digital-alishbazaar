create table if not exists public.subcategories (
  category text not null,
  id text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (category, id)
);

grant select on public.subcategories to anon;
grant select on public.subcategories to authenticated;
grant all on public.subcategories to service_role;

alter table public.subcategories enable row level security;

drop policy if exists "Subcategories are public" on public.subcategories;
create policy "Subcategories are public"
  on public.subcategories for select
  using (true);

drop policy if exists "Admins manage subcategories" on public.subcategories;
create policy "Admins manage subcategories"
  on public.subcategories for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

insert into public.subcategories (category, id, position)
select t.cat, s.id, (s.ord - 1)::int
from (values
    ('cars','sedans,suv,trucks,buses,motorcycles,rickshaw,car_parts,tires_rims,car_accessories,car_repair,car_rental,other'),
    ('property','house,apartment,land,shop,office,garden,farm,warehouse,commercial,house_rent,shop_rent,property_sale,other'),
    ('jobs','office_jobs,sales,construction,driving,technical,restaurant,retail,online,part_time,full_time,internship,other'),
    ('electronics','tv,computers,laptops,printers,cameras,audio,appliances,networking,gaming,components,other'),
    ('mobiles','phones,tablets,smartwatch,accessories,chargers,headphones,phone_parts,phone_repair,sim_services,other'),
    ('services','phone_repair,computer_repair,electrical,plumbing,carpentry,painting,construction,cleaning,tailoring,beauty,photography,graphic_design,translation,transport,internet_services,tutoring,printing,technical,other'),
    ('fashion','mens,womens,kids,shoes,bags,watches,jewelry,cosmetics,traditional,other'),
    ('home','furniture,tables_chairs,beds,kitchen,decor,carpets,curtains,home_appliances,bedding,other'),
    ('business','shops,shop_equipment,machinery,office_equipment,raw_materials,wholesale,opportunity,partnership,other'),
    ('education','books,stationery,courses,language,tutoring,edu_services,university,other'),
    ('agriculture','farm_land,crops,seeds,fertilizer,farm_machinery,farm_tools,irrigation,plants,other'),
    ('animals','pets,birds,cows,sheep,goats,horses,livestock,animal_feed,animal_supplies,vet,other'),
    ('others','personal,gifts,second_hand,collectibles,travel,sports,other')
) as t(cat, ids),
lateral unnest(string_to_array(t.ids, ',')) with ordinality as s(id, ord)
on conflict (category, id) do update set position = excluded.position;

alter table public.listings add column if not exists subcategory text;

create index if not exists listings_category_subcategory_idx
  on public.listings (category, subcategory);

alter table public.listings drop constraint if exists listings_subcategory_fkey;
alter table public.listings
  add constraint listings_subcategory_fkey
  foreign key (category, subcategory)
  references public.subcategories (category, id)
  on update cascade
  on delete set null;