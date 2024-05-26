/*
 * File: ra-data-table.js
 * Author: Raúl H. Chávez V.
 * Date: 2024-05-25
 * Description: This JS file provides a custom HTML element to display data in a table format with pagination, sorting, and filtering capabilities.
 * 
 * MIT License
 *
 * Copyright (c) 2024 Raúl H. Chávez V.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class RaDataTable {
    constructor(element, options) {
        this._element = element;
        this._options = Object.assign({
            page: 1,
            pageSize: 5,
            keyField: null,
        }, options);

        this._isEditable = false;
        this._isEditing = false;
        this._data = [];
        this._columns = [];
        this._totalRows = 0;

        this._sortField = null;
        this._sortDirection = 'asc';
        this._filters = {};

        this._render();

        document.addEventListener('keydown', (e) => this._handleSelectedCell(e));
        document.addEventListener('click', (e) => this._handleClickOutside(e));
    }

    _render() {
        this._element.innerHTML = '';
        this._element.classList.add('ra-data-table-container');

        const table = document.createElement('table');
        table.classList.add('ra-datatable');

        const thead = document.createElement('thead');
        table.appendChild(thead);

        const thead_tr = document.createElement('tr');
        thead.appendChild(thead_tr);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        this._element.appendChild(table);

        const pagination = document.createElement('div');
        //pagination.classList.add('pagination');
        this._paginator = new RaDataPaginator(pagination, {
            page: this._options.page,
            pageSize: this._options.pageSize,
            totalRows: this._totalRows,
            onPageChange: (page) => {
                this._options.page = page;
                this._fetchData();
            }
        });

        this._element.appendChild(pagination);


    }

    _handleClickOutside(event) {
        const selectedCell = this._element.querySelector('.ra-selected-cell');
        if (selectedCell) {
            selectedCell.classList.remove('ra-selected-cell');
        }
    }

    set columns(columns) {
        this._columns = columns;
        this._renderTableHeaders();
    }

    set page(page) {
        this._options.page = page;
        this._fetchData();
    }

    set onFetchData(func) {
        this._onFetchData = func;
    }

    set editable(value) {
        this._isEditable = value;
        this._renderTable();
        this._renderPagination();
    }

    loadData(data, totalRows = data.length, page = 1) {
        this._options.page = page;
        this._totalRows = totalRows;
        this._data = data;
        this._renderTable();
        this._renderPagination();
    }

    _renderTableHeaders() {
        const thead = this._element.querySelector('.ra-datatable thead');
        thead.innerHTML = '';

        const head_tr = document.createElement('tr');
        thead.appendChild(head_tr);
        this._columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.header;
            th.dataset.field = column.field;

            if (column.sortable) {
                const sortIcon = document.createElement('i');
                sortIcon.classList.add('fa-solid');
                if (this._sortField === column.field) {
                    sortIcon.classList.add(this._sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
                } else {
                    sortIcon.classList.add('fa-sort');
                }
                sortIcon.addEventListener('click', () => this._sortByColumn(sortIcon, column.field));
                th.appendChild(sortIcon);
            }

            head_tr.appendChild(th);
        });

        const filter_tr = document.createElement('tr');
        thead.appendChild(filter_tr);
        this._columns.forEach(column => {
            const th = document.createElement('th');
            const filter = document.createElement('input');
            filter.type = 'text';
            filter.placeholder = 'Filter';
            filter.addEventListener('change', () => this._filterColumn(column.field, filter.value));
            th.appendChild(filter);
            filter_tr.appendChild(th);
        });
    }

    _filterColumn(field, value) {
        this._filters[field] = { text: value, opt: "=" };
        this._fetchData();
    }

    _renderTable() {
        const tbody = this._element.querySelector('.ra-datatable tbody');
        tbody.innerHTML = '';

        if (!this._data || this._data.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = this._columns.length;
            td.textContent = 'No data found';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        this._data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            this._columns.forEach((column, colIdenx) => {
                const td = document.createElement('td');
                td.dataset.field = column.field;
                td.dataset.rowIndex = rowIndex;
                td.dataset.colIndex = colIdenx;
                td.classList.add('ra-cell');

                if (this._isEditable) {
                    td.addEventListener('click', (e) => {
                        if (e) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        return this._editCell(td, column);
                    });
                } else {
                    td.addEventListener('click', (e) => {
                        if (e) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        return this._selectCell(td);
                    });
                }

                if (column.displayFormat && typeof column.displayFormat === 'string') {
                    td.textContent = Ra.convertDateFormat(row[column.field], column.fieldFormat, column.displayFormat);
                    td.dataset.fieldFormat = column.fieldFormat;
                    td.dataset.displayFormat = column.displayFormat;
                } else if (column.displayFormat && typeof column.displayFormat === 'function') {
                    td.textContent = column.displayFormat(row[column.field]);
                } else {
                    td.textContent = row[column.field];
                }

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        const td = tbody.querySelector('td');
        if (td) {
            this._selectCell(td);
        }
    }

    _selectCell(td) {
        const selectedCell = this._element.querySelector('.ra-selected-cell');
        if (selectedCell) {
            selectedCell.classList.remove('ra-selected-cell');
        }
        td.classList.add('ra-selected-cell');
        td.focus();
        td.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    _handleSelectedCell(e) {
        const td = this._element.querySelector('.ra-selected-cell');
        if (!this._isEditing && td && td.tagName.toLowerCase() === 'td') {
            const currentRowIndex = parseInt(td.dataset.rowIndex);
            const currentColumnIndex = parseInt(td.dataset.colIndex);

            let nextRowIndex = currentRowIndex;
            let nextColumnIndex = currentColumnIndex;

            switch (e.key) {
                case 'ArrowUp':
                    if (currentRowIndex > 0) nextRowIndex -= 1;
                    break;
                case 'ArrowDown':
                    if (currentRowIndex < this._data.length - 1) nextRowIndex += 1;
                    break;
                case 'ArrowLeft':
                    if (currentColumnIndex > 0) nextColumnIndex -= 1;
                    break;
                case 'ArrowRight':
                    if (currentColumnIndex < this._columns.length - 1) nextColumnIndex += 1;
                    break;
                default:
                    return;
            }

            e.preventDefault();

            const nextTd = this._element.querySelector(`td[data-row-index="${nextRowIndex}"][data-col-index="${nextColumnIndex}"]`);
            if (nextTd) {
                this._selectCell(nextTd);
            }
        }
    }

    _editCell(td, column) {
        if (!this._isEditable) return;
        this._isEditing = true;

        this._selectCell(td);
        const field = td.dataset.field;
        const rowIndex = parseInt(td.dataset.rowIndex);
        const currentValue = this._data[rowIndex][field];
        const keyValue = this._options.keyField ? this._data[rowIndex][this._options.keyField] : null;
        let escPressed = false;

        const editor = document.createElement('input');
        editor.value = currentValue;

        switch (column.type) {
            case 'number':
                editor.type = 'number';
                break;
            case 'date':
                editor.type = 'date';
                break;
            case 'autocomplete':
                editor.type = 'text';
                // Add autocomplete implementation here
                break;
            default:
                editor.type = 'text';
                break;
        }

        editor.addEventListener('keydown', (e) => {
            if (e.key == 'Tab') {
                e.preventDefault();
            }
        });

        editor.addEventListener('keyup', (e) => {
            if (e.key == 'Enter') {
                e.preventDefault();
                escPressed = true;
                this._saveEdit(td, rowIndex, keyValue, field, editor.value);
                this._focusNext(td);
            } else if (e.key == 'Tab') {
                e.preventDefault();
                escPressed = true;
                this._saveEdit(td, rowIndex, keyValue, field, editor.value);
                this._focusNext(td, e.shiftKey ? -1 : 1);
            } else if (e.key == 'Escape') {
                e.preventDefault();
                escPressed = true;
                td.textContent = currentValue;
                this._isEditing = false;
            }
        });

        editor.addEventListener('blur', () => {
            if (!escPressed) {
                this._saveEdit(td, rowIndex, keyValue, field, editor.value);
            }
        });

        td.innerHTML = '';
        td.appendChild(editor);
        editor.focus();
    }

    _saveEdit(td, rowIndex, keyValue, field, value) {

        const filedFormat = td.dataset.fieldFormat;
        const displayFormat = td.dataset.displayFormat;
        this._data[rowIndex][field] = value;

        if (filedFormat && displayFormat) {
            td.textContent = Ra.convertDateFormat(value, filedFormat, displayFormat);
        } else {
            td.textContent = value;
        }

        if (this._onEdited) {
            this._onEdited(rowIndex, keyValue, field, value, filedFormat, displayFormat);
        }

        this._isEditing = false;
    }

    _focusNext(td, direction = 1) {
        const cells = Array.from(this._element.querySelectorAll('.ra-cell'));
        const currentIndex = cells.indexOf(td);
        const nextIndex = (currentIndex + direction + cells.length) % cells.length;
        const nextTd = cells[nextIndex];
        if (nextTd) {
            this._editCell(nextTd, this._columns.find(col => col.field === nextTd.dataset.field));
        }
    }

    _sortByColumn(field) {
        const direction = this._sortField === field && this._sortDirection === 'asc' ? 'desc' : 'asc';
        this._sortField = field;
        this._sortDirection = direction;
        this._fetchData();
    }

    _fetchData() {
        if (!this._onFetchData) return;
        this._onFetchData({
            page: this._options.page,
            pageSize: this._options.pageSize,
            sortField: this._sortField,
            sortDirection: this._sortDirection,
            filters: Ra.toArray(this._filters, (k, v) => ({ field: k, value: v.text, opt: v.opt }))
        }).then(data => {
            this.loadData(data.items, data.total, data.page);
        });
    }

    _renderPagination() {
        this._paginator.setOptions({
            page: this._options.page,
            pageSize: this._options.pageSize,
            totalRows: this._totalRows
        });
    }
}