/**
 * States Repository
 *
 * The States list (Records v2, #322): one item per State of a Record Type. The app reads it
 * (cached) to resolve each Record's State; the maintainer edits it directly in SharePoint.
 */

import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { sharePoint } from '../../config';
import { STATE_AFTER, STATE_AFTER_STYLE, STATE_BEFORE, STATE_BEFORE_STYLE, STATE_NAME, STATE_TYPE } from '../field-names';
import type { RecordState } from '../../../types/record-state';

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
}

export const statesRepository = new StatesRepository();
