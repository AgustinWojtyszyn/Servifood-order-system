-- When an authorized discount removes the last operational unit, the order must
-- not remain pending/post_report_extra with zero items. Also discard operational
-- responses that no longer have a menu unit to describe.

create or replace function public.order_discount_adjust_custom_responses(
  p_custom_responses jsonb,
  p_target_item jsonb,
  p_item_index integer,
  p_discount_quantity integer,
  p_target_item_quantity_after integer,
  p_menu_total_after integer
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_response jsonb;
  v_next_response jsonb;
  v_quantities jsonb;
  v_quantity_total integer;
  v_explicit_quantity integer;
  v_reduce integer;
  v_linked boolean;
  v_operational boolean;
  v_keep_response boolean;
begin
  if coalesce(jsonb_typeof(p_custom_responses), '') <> 'array' then
    return '[]'::jsonb;
  end if;

  if greatest(coalesce(p_menu_total_after, 0), 0) = 0 then
    return '[]'::jsonb;
  end if;

  for v_response in
    select value
    from jsonb_array_elements(p_custom_responses) as item(value)
  loop
    if jsonb_typeof(v_response) <> 'object' then
      v_result := v_result || jsonb_build_array(v_response);
      continue;
    end if;

    v_next_response := v_response;
    v_linked := public.order_discount_response_matches_item(v_response, p_target_item, p_item_index);
    v_operational := public.order_discount_is_operational_response(v_response);
    v_quantities := v_response->'quantities';
    v_keep_response := true;

    if v_linked and coalesce(p_target_item_quantity_after, 0) <= 0 then
      v_keep_response := false;
    elsif jsonb_typeof(v_quantities) = 'object' then
      v_quantity_total := public.order_discount_sum_quantities(v_quantities);
      if v_linked then
        v_reduce := least(greatest(coalesce(p_discount_quantity, 0), 0), v_quantity_total);
      elsif v_operational and v_quantity_total > greatest(coalesce(p_menu_total_after, 0), 0) then
        v_reduce := v_quantity_total - greatest(coalesce(p_menu_total_after, 0), 0);
      else
        v_reduce := 0;
      end if;

      if v_reduce > 0 then
        v_next_response := jsonb_set(
          v_next_response,
          '{quantities}',
          public.order_discount_reduce_quantities(v_quantities, v_reduce),
          true
        );
      end if;

      if jsonb_typeof(v_next_response->'response') = 'array' then
        v_next_response := public.order_discount_trim_response_array(
          v_next_response,
          'response',
          public.order_discount_sum_quantities(v_next_response->'quantities')
        );
      end if;
    elsif v_linked and jsonb_typeof(v_next_response->'response') = 'array' then
      v_next_response := public.order_discount_trim_response_array(
        v_next_response,
        'response',
        greatest(coalesce(p_target_item_quantity_after, 0), 0)
      );
    elsif v_operational and jsonb_typeof(v_next_response->'response') = 'array'
      and jsonb_array_length(v_next_response->'response') > greatest(coalesce(p_menu_total_after, 0), 0)
    then
      v_next_response := public.order_discount_trim_response_array(
        v_next_response,
        'response',
        greatest(coalesce(p_menu_total_after, 0), 0)
      );
    elsif v_operational then
      v_explicit_quantity := coalesce(
        public.order_discount_jsonb_positive_int(v_next_response->'quantity'),
        public.order_discount_jsonb_positive_int(v_next_response->'qty'),
        public.order_discount_jsonb_positive_int(v_next_response->'count')
      );
      if v_explicit_quantity is not null and v_explicit_quantity > greatest(coalesce(p_menu_total_after, 0), 0) then
        if v_next_response ? 'quantity' then
          v_next_response := jsonb_set(v_next_response, '{quantity}', to_jsonb(greatest(coalesce(p_menu_total_after, 0), 0)), true);
        end if;
        if v_next_response ? 'qty' then
          v_next_response := jsonb_set(v_next_response, '{qty}', to_jsonb(greatest(coalesce(p_menu_total_after, 0), 0)), true);
        end if;
        if v_next_response ? 'count' then
          v_next_response := jsonb_set(v_next_response, '{count}', to_jsonb(greatest(coalesce(p_menu_total_after, 0), 0)), true);
        end if;
      end if;
    end if;

    if v_keep_response then
      v_result := v_result || jsonb_build_array(v_next_response);
    end if;
  end loop;

  return v_result;
end;
$$;

create or replace function public.create_order_item_discount(p_payload jsonb)
returns setof public.order_item_discounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.users%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_delivery_date date;
  v_item_index integer;
  v_quantity integer;
  v_reason text;
  v_request_id text;
  v_target_item jsonb;
  v_available integer;
  v_new_quantity integer;
  v_new_items jsonb;
  v_new_total_items integer;
  v_new_custom_responses jsonb;
  v_new_status text;
  v_before jsonb;
  v_after jsonb;
  v_discount public.order_item_discounts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.can_manage_order_discounts(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select *
  into v_actor
  from public.users
  where id = auth.uid();

  if v_actor.id is null then
    raise exception 'actor_not_found';
  end if;

  v_order_id := nullif(trim(coalesce(p_payload->>'order_id', '')), '')::uuid;
  v_delivery_date := nullif(trim(coalesce(p_payload->>'delivery_date', '')), '')::date;
  v_item_index := nullif(trim(coalesce(p_payload->>'item_index', '')), '')::integer;
  v_quantity := nullif(trim(coalesce(p_payload->>'quantity', '')), '')::integer;
  v_reason := nullif(trim(coalesce(p_payload->>'reason', '')), '');
  v_request_id := nullif(trim(coalesce(p_payload->>'request_id', '')), '');

  if v_request_id is null then
    raise exception 'request_id_required';
  end if;

  select *
  into v_discount
  from public.order_item_discounts
  where request_id = v_request_id;

  if found then
    return next v_discount;
    return;
  end if;

  if v_order_id is null then
    raise exception 'order_id_required';
  end if;
  if v_delivery_date is null then
    raise exception 'delivery_date_required';
  end if;
  if v_item_index is null or v_item_index < 0 then
    raise exception 'item_index_invalid';
  end if;
  if v_quantity is null or v_quantity <= 0 then
    raise exception 'quantity_invalid';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;

  select *
  into v_order
  from public.orders
  where id = v_order_id
    and delivery_date = v_delivery_date
    and status in ('pending', 'archived', 'post_report_extra')
  for update;

  if v_order.id is null then
    raise exception 'order_not_found_for_operational_date';
  end if;

  select elem
  into v_target_item
  from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) with ordinality as item(elem, ord)
  where ord = v_item_index + 1
    and jsonb_typeof(elem) = 'object';

  if v_target_item is null then
    raise exception 'item_not_found';
  end if;

  v_available := case
    when v_target_item ? 'quantity'
      then coalesce(public.order_discount_jsonb_positive_int(v_target_item->'quantity'), 0)
    else 1
  end;

  if v_quantity > v_available then
    raise exception 'quantity_exceeds_available';
  end if;

  v_new_quantity := v_available - v_quantity;
  v_new_total_items := greatest(coalesce(v_order.total_items, 0) - v_quantity, 0);
  v_before := to_jsonb(v_order);

  select coalesce(jsonb_agg(next_item order by ord), '[]'::jsonb)
  into v_new_items
  from (
    select
      ord,
      case
        when ord = v_item_index + 1 and v_new_quantity > 0
          then jsonb_set(elem, '{quantity}', to_jsonb(v_new_quantity), true)
        when ord = v_item_index + 1 and v_new_quantity = 0
          then null
        else elem
      end as next_item
    from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) with ordinality as item(elem, ord)
  ) rebuilt
  where next_item is not null;

  v_new_custom_responses := public.order_discount_adjust_custom_responses(
    coalesce(v_order.custom_responses, '[]'::jsonb),
    v_target_item,
    v_item_index,
    v_quantity,
    v_new_quantity,
    v_new_total_items
  );

  v_new_status := v_order.status;
  if v_new_total_items = 0 then
    v_new_custom_responses := '[]'::jsonb;
    if v_order.status in ('pending', 'post_report_extra') then
      v_new_status := 'cancelled';
    end if;
  end if;

  update public.orders
  set items = v_new_items,
      custom_responses = v_new_custom_responses,
      total_items = v_new_total_items,
      status = v_new_status,
      updated_at = now()
  where id = v_order.id
  returning *
  into v_order;

  v_after := to_jsonb(v_order);

  insert into public.order_item_discounts (
    order_id,
    delivery_date,
    order_origin,
    company_slug,
    company_name,
    location,
    service,
    item_index,
    item_id,
    item_name,
    quantity,
    reason,
    created_by,
    created_by_email,
    created_by_name,
    order_snapshot_before,
    order_snapshot_after,
    request_id
  )
  values (
    v_order.id,
    v_order.delivery_date,
    coalesce(nullif(trim(v_order.order_origin), ''), 'user'),
    v_order.company_slug,
    v_order.company_name,
    v_order.location,
    v_order.service,
    v_item_index,
    coalesce(nullif(trim(coalesce(p_payload->>'item_id', '')), ''), nullif(trim(coalesce(v_target_item->>'id', '')), '')),
    coalesce(nullif(trim(coalesce(p_payload->>'item_name', '')), ''), nullif(trim(coalesce(v_target_item->>'name', '')), ''), 'Ítem sin nombre'),
    v_quantity,
    v_reason,
    auth.uid(),
    v_actor.email,
    coalesce(nullif(trim(v_actor.full_name), ''), v_actor.email),
    v_before,
    v_after,
    v_request_id
  )
  returning *
  into v_discount;

  insert into public.audit_logs (
    action,
    details,
    actor_id,
    actor_email,
    actor_name,
    target_id,
    target_email,
    target_name,
    metadata,
    request_id,
    created_at
  )
  values (
    'order_item_discount_created',
    'Descuento de ítem de pedido registrado por administrador',
    auth.uid(),
    v_actor.email,
    coalesce(nullif(trim(v_actor.full_name), ''), v_actor.email),
    v_order.user_id,
    v_order.customer_email,
    v_order.customer_name,
    jsonb_build_object(
      'discount_id', v_discount.id,
      'order_id', v_order.id,
      'delivery_date', v_order.delivery_date,
      'order_origin', coalesce(nullif(trim(v_order.order_origin), ''), 'user'),
      'company_slug', v_order.company_slug,
      'company_name', v_order.company_name,
      'location', v_order.location,
      'service', v_order.service,
      'item_index', v_item_index,
      'item_id', v_discount.item_id,
      'item_name', v_discount.item_name,
      'quantity', v_quantity,
      'available_before', v_available,
      'remaining_after', v_new_quantity,
      'status_before', v_before->>'status',
      'status_after', v_order.status,
      'closed_after_discount', (
        v_new_total_items = 0
        and coalesce(v_before->>'status', '') in ('pending', 'post_report_extra')
        and v_order.status = 'cancelled'
      ),
      'reason', v_reason,
      'snapshot_before', v_before,
      'snapshot_after', v_after
    ),
    v_request_id,
    now()
  );

  return next v_discount;
end;
$$;

revoke all on function public.create_order_item_discount(jsonb) from public;
revoke all on function public.create_order_item_discount(jsonb) from anon;
grant execute on function public.create_order_item_discount(jsonb) to authenticated;
