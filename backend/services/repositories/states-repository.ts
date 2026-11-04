/**
 * States Repository
 *
 * The States list (Records v2, #322): one item per State of a Record Type. The app reads it
 * (cached, getStates) to resolve each Record's State; the Records migration reads it fresh and
 * inserts missing States.
 */

import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { sharePoint } from '../../config';
import { STATE_AFTER, STATE_AFTER_STYLE, STATE_BEFORE, STATE_BEFORE_STYLE, STATE_NAME, STATE_TYPE } from '../field-names';
import type { RecordState } from '../../../types/record-state';

export interface SharePointState {
  ID: number;
  /** The State's name (the Name column). */
  Name?: string;
  /** The Record Type it belongs to. */
  Type?: string;
  /** "{Type} {Name}", for readability in SharePoint only (stateTitle). */
  Title?: string;
}

/** A State's Title: "{Type} {Name}" (e.g. "Charity Membership Accepted"). */
export const stateTitle = (type: string, name: string) => `${type} ${name}`;

class StatesRepository {
  private get listGuid(): string { return sharePoint.lists.states; }

  /** Every State with its labels and styles, cached briefly (the maintainer edits the list directly). */
  async getStates(): Promise<RecordState[]> {
    const cacheKey = 'states';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) return cached as RecordState[];
    const items = await sharePointClient.getListItems(
      this.listGuid,
      `ID,${STATE_NAME},${STATE_TYPE},${STATE_BEFORE},${STATE_AFTER},${STATE_BEFORE_STYLE},${STATE_AFTER_STYLE}`,
    );
    const states: RecordState[] = items.map((item: Record<string, any>) => ({
      id: item.ID,
      type: item[STATE_TYPE] ?? '',
      name: item[STATE_NAME] ?? '',
      before: item[STATE_BEFORE] || undefined,
      after: item[STATE_AFTER] || undefined,
      beforeStyle: item[STATE_BEFORE_STYLE] || undefined,
      afterStyle: item[STATE_AFTER_STYLE] || undefined,
    }));
    sharePointClient.cache.set(cacheKey, states, CACHE_TTL.states);
    return states;
  }

  /** Not cached: the migration reads it fresh, and the maintainer edits it directly. */
  async getAll(): Promise<SharePointState[]> {
    const items = await sharePointClient.getListItems(this.listGuid, `ID,Title,${STATE_NAME},${STATE_TYPE}`);
    return items.map((item: Record<string, any>) => ({ ID: item.ID, Name: item[STATE_NAME], Type: item[STATE_TYPE], Title: item.Title }));
  }

  /**
   * Title is "{Type} {Name}" (e.g. "Charity Membership Accepted"), so SharePoint's own dropdowns
   * and views read naturally; the app reads Name and RecordType.
   */
  async create(fields: { Name: string; Type: string }): Promise<number> {
    sharePointClient.clearCacheKey('states');
    return await sharePointClient.createListItem(this.listGuid, {
      Title: stateTitle(fields.Type, fields.Name),
      [STATE_NAME]: fields.Name,
      [STATE_TYPE]: fields.Type,
    });
  }

  async updateTitle(id: number, title: string): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, id, { Title: title });
  }
}

export const statesRepository = new StatesRepository();
