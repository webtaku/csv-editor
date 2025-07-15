import { el } from '@webtaku/el';
import * as Papa from 'papaparse';
import { ColumnDefinition, EditModule, Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

Tabulator.registerModule([EditModule]);

declare function acquireVsCodeApi(): {
  postMessage: (msg: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

const vscode = acquireVsCodeApi();
const container = el();
const table = new Tabulator(container);

function sendEdit() {
  const data = table.getData();
  const csv = Papa.unparse(data);
  vscode.postMessage({ type: 'edit', data: csv });
}

table.on('cellEdited', () => {
  table.redraw(true);
  sendEdit();
})

document.body.append(container, el('button', 'Add Row', {
  style: {
    position: 'fixed',
    bottom: '0',
  },
  onclick: async () => {
    await table.addRow();
    sendEdit();
  },
}));

window.addEventListener('message', (event) => {
  const msg = event.data;

  if (msg.type === 'csv-data') {
    const parsed = Papa.parse(msg.data, { header: true });
    const cols: ColumnDefinition[] = Object.keys(parsed.data[0] || {}).map(k => ({
      title: k, field: k, editor: 'input'
    }));
    table.setColumns(cols);
    table.setData(parsed.data);
  }
});

// Ctrl/Cmd + S 저장
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    vscode.postMessage({ type: 'save' });
  }
});

window.addEventListener('load', () => {
  vscode.postMessage({ type: 'ready' });
});
