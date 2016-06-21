/* eslint no-shadow:[0] */
import test from 'tape';
import spy from 'sinon/lib/sinon/spy'; // avoid babel-register-related error by importing only spy
import Store from '../src/store';
import { createMap, createFeature, getPublicMemberKeys } from './test_utils';

function createStore() {
  const map = createMap();
  spy(map, 'fire');
  const ctx = { map };
  return new Store(ctx);
}

test('Store has correct properties', t => {
  t.ok(Store, 'store exists');
  t.ok(typeof Store === 'function', 'store is a function');
  t.end();
});

test('Store constructor and public API', t => {
  const map = createMap();
  const ctx = { map };
  const store = new Store(ctx);

  // instance members
  t.deepEqual(store.sources, {
    hot: [],
    cold: []
  }, 'exposes store.sources');
  t.equal(store.ctx, ctx, 'exposes store.ctx');
  t.equal(store.isDirty, false, 'exposes store.isDirty');
  t.equal(typeof store.render, 'function', 'exposes store.render');

  t.equal(getPublicMemberKeys(store).length, 4, 'no unexpected instance members');

  // prototype members
  t.equal(typeof Store.prototype.setDirty, 'function', 'exposes store.setDirty');
  t.equal(typeof Store.prototype.featureChanged, 'function', 'exposes store.featureChanged');
  t.equal(typeof Store.prototype.getChangedIds, 'function', 'exposes store.getChangedIds');
  t.equal(typeof Store.prototype.clearChangedIds, 'function', 'exposes store.clearChangedIds');
  t.equal(typeof Store.prototype.getAllIds, 'function', 'exposes store.getAllIds');
  t.equal(typeof Store.prototype.add, 'function', 'exposes store.add');
  t.equal(typeof Store.prototype.get, 'function', 'exposes store.get');
  t.equal(typeof Store.prototype.getAll, 'function', 'exposes store.getAll');
  t.equal(typeof Store.prototype.select, 'function', 'exposes store.select');
  t.equal(typeof Store.prototype.deselect, 'function', 'exposes store.deselect');
  t.equal(typeof Store.prototype.clearSelected, 'function', 'exposes store.clearSelected');
  t.equal(typeof Store.prototype.getSelectedIds, 'function', 'exposes store.getSelectedIds');
  t.equal(typeof Store.prototype.isSelected, 'function', 'exposes store.isSelected');
  t.equal(typeof Store.prototype.delete, 'function', 'exposes store.delete');
  t.equal(typeof Store.prototype.setSelected, 'function', 'exposes store.setSelected');
  t.equal(typeof Store.prototype.flushSelected, 'function', 'exposes store.flushSelected');

  t.equal(getPublicMemberKeys(Store.prototype).length, 16, 'no untested prototype members');

  t.end();
});

test('Store#setDirty', t => {
  const store = createStore();
  t.equal(store.isDirty, false);
  store.setDirty();
  t.equal(store.isDirty, true);
  t.end();
});

test('Store#featureChanged, Store#getChangedIds, Store#clearChangedIds', t => {
  const store = createStore();
  t.deepEqual(store.getChangedIds(), []);
  store.featureChanged('x');
  t.deepEqual(store.getChangedIds(), ['x']);
  store.featureChanged('y');
  t.deepEqual(store.getChangedIds(), ['x', 'y']);
  store.featureChanged('x');
  t.deepEqual(store.getChangedIds(), ['x', 'y'], 'ids do not duplicate');
  store.clearChangedIds();
  t.deepEqual(store.getChangedIds(), []);
  t.end();
});

test('Store#add, Store#get, Store#getAll', t => {
  const store = createStore();
  t.equal(store.get(1), undefined);
  t.deepEqual(store.getAll(), []);
  const point = createFeature('point');
  const line = createFeature('line');
  store.add(point);
  t.equal(store.get(point.id), point);
  t.deepEqual(store.getAll(), [point]);
  store.add(line);
  t.equal(store.get(point.id), point);
  t.equal(store.get(line.id), line);
  t.deepEqual(store.getAll(), [point, line]);
  store.add(point);
  t.equal(store.get(point.id), point);
  t.equal(store.get(line.id), line);
  t.deepEqual(store.getAll(), [point, line]);
  t.end();
});

test('selection methods', t => {
  const store = createStore();
  const f1 = createFeature('point');
  const f2 = createFeature('point');
  const f3 = createFeature('point');
  const f4 = createFeature('point');

  t.deepEqual(store.getSelectedIds(), []);

  t.test('select one feature', st => {
    store.select(f1.id);
    st.deepEqual(store.getSelectedIds(), [f1.id], 'f1 returns in selected array');
    st.equal(store.isSelected(f1.id), true, 'isSelected affirms f1');
    st.equal(store.isSelected(f2.id), false, 'isSelected rejects f2');
    st.deepEqual(store.flushSelected(), {
      deselected: [],
      selected: [f1.id]
    });
    st.end();
  });

  t.test('select a second feature', st => {
    store.ctx.map.fire.reset();
    store.select(f2.id);
    st.deepEqual(store.getSelectedIds(), [f1.id, f2.id], 'f1 and f2 return in selected array');
    st.equal(store.isSelected(f1.id), true, 'isSelected affirms f1');
    st.equal(store.isSelected(f2.id), true, 'isSelected affirms f2');
    st.deepEqual(store.flushSelected(), {
      deselected: [],
      selected: [f2.id]
    });
    st.end();
  });

  t.test('try to re-select first feature', st => {
    store.ctx.map.fire.reset();
    store.select(f1.id);
    st.deepEqual(store.flushSelected(), {
      deselected: [],
      selected: []
    });
    st.end();
  });

  t.test('deselect a feature', st => {
    store.ctx.map.fire.reset();
    store.deselect(f1.id);
    st.deepEqual(store.getSelectedIds(), [f2.id], 'deselection of f1 clears it from selected array');
    st.deepEqual(store.flushSelected(), {
      deselected: [f1.id],
      selected: []
    });
    st.end();
  });

  t.test('serially select more features', st => {
    store.ctx.map.fire.reset();
    store.select(f3.id);
    store.select(f4.id);
    st.deepEqual(store.getSelectedIds(), [f2.id, f3.id, f4.id], 'serial selection of f3 and f4 reflected in selected array');
    st.deepEqual(store.flushSelected(), {
      deselected: [],
      selected: [f3.id, f4.id]
    });
    st.end();
  });

  t.test('clear selection', st => {
    store.ctx.map.fire.reset();
    store.clearSelected();
    st.deepEqual(store.getSelectedIds(), []);
    st.deepEqual(store.flushSelected(), {
      deselected: [f2.id, f3.id, f4.id],
      selected: []
    });
    st.end();
  });

  t.test('select an array of features', st => {
    store.ctx.map.fire.reset();
    store.select([f1.id, f3.id, f4.id]);
    st.deepEqual(store.getSelectedIds(), [f1.id, f3.id, f4.id]);
    st.deepEqual(store.flushSelected(), {
      deselected: [],
      selected: [f1.id, f3.id, f4.id]
    });
    st.end();
  });

  t.test('deselect an array of features', st => {
    store.ctx.map.fire.reset();
    store.deselect([f1.id, f4.id]);
    st.deepEqual(store.getSelectedIds(), [f3.id]);
    st.deepEqual(store.flushSelected(), {
      deselected: [f1.id, f4.id],
      selected: []
    });
    st.end();
  });

  t.end();
});

test('Store#delete', t => {
  const store = createStore();
  const point = createFeature('point');
  const line = createFeature('line');
  const polygon = createFeature('polygon');

  store.add(point);
  store.add(line);
  store.add(polygon);
  t.deepEqual(store.getAll(), [point, line, polygon]);
  t.deepEqual(store.getAllIds(), [point.id, line.id, polygon.id]);

  t.deepEqual(store.getSelectedIds(), []);
  store.select(line.id);
  t.deepEqual(store.getSelectedIds(), [line.id]);

  store.ctx.map.fire.reset();
  store.delete(line.id);
  t.deepEqual(store.getAll(), [point, polygon]);
  t.deepEqual(store.getAllIds(), [point.id, polygon.id]);
  t.deepEqual(store.getSelectedIds(), []);
  t.equal(store.ctx.map.fire.callCount, 1);
  t.deepEqual(store.ctx.map.fire.getCall(0).args, ['draw.deleted', {
    featureIds: [line]
  }]);
  t.equal(store.isDirty, true, 'after deletion store is dirty');

  t.end();
});

test('Store#setSelected', t => {
  const store = createStore();
  const point = createFeature('point');
  const line = createFeature('line');
  const polygon = createFeature('polygon');

  store.setSelected(point.id);
  t.deepEqual(store.getSelectedIds(), [point.id]);
  t.deepEqual(store.flushSelected(), {
    deselected: [],
    selected: [point.id]
  });

  store.setSelected([line.id, polygon.id]);
  t.deepEqual(store.getSelectedIds(), [line.id, polygon.id]);
  t.deepEqual(store.flushSelected(), {
    deselected: [point.id],
    selected: [line.id, polygon.id]
  });

  store.setSelected(line.id);
  t.deepEqual(store.getSelectedIds(), [line.id]);
  t.deepEqual(store.flushSelected(), {
    deselected: [polygon.id],
    selected: []
  });

  store.setSelected();
  t.deepEqual(store.getSelectedIds(), []);
  t.deepEqual(store.flushSelected(), {
    deselected: [line.id],
    selected: []
  });

  t.end();
});
