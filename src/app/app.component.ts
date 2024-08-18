import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import _ from 'lodash';
import moment from 'moment';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSelectModule, NzSelectOptionInterface } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApptData } from './app.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AgGridModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzGridModule,
    NzSelectModule,
    NzFormModule,
    NzFlexModule,
    NzTableModule,
    NzMessageModule,
    NzDatePickerModule,
    ReactiveFormsModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild("agGrid") agGrid!: AgGridAngular;
  // 用於存儲所有預約時間
  apptTimes: Set<Date> = new Set();
  apptFrom = new FormGroup({
    apptTime: new FormControl<Date | null>(null, Validators.required)
  });

  // 用於存儲所有用戶，以及他們的預約時間
  users: Set<string> = new Set();
  userForm = new FormGroup({
    userName: new FormControl<string | null>(null, Validators.required),
    userTime: new FormControl<Date[] | null>(null, Validators.required)
  });

  // 預約時段，沒預約到用戶
  unMatchUsers: Set<string> = new Set();

  // 表單選項，GridOptions 和 rowData
  timeOptions: NzSelectOptionInterface[] = []
  gridOptions: GridOptions = {
    columnDefs: [
      {
        headerName: '時段',
        field: 'apptTime',
        valueFormatter:  (params) => {
          const value: Date = params.value;
          return moment(value).format('MM/DD HH');
        }
      },
      { headerName: '客人', field: 'users' }
    ]
  }
  rowData: ApptData[] = [];
  rowData2: ApptData[] = [];

  /**
   * 新增預約時間
   */
  onAddApptTime() {
    if (!this.valid(this.apptFrom)) {
      return;
    }
    const newTime = _.clone(this.apptFrom.value.apptTime) as Date;
    newTime.setMinutes(0);
    newTime.setSeconds(0);

    if (this.apptTimes.has(newTime)) {
      alert("已有相同時段");
      return;
    }

    this.apptTimes.add(newTime);
    const newRowData = { apptTime: newTime, users: [] };
    this.rowData = _.sortBy([...this.rowData, newRowData], "apptTime");
    this.timeOptions = _.sortBy([...this.timeOptions, { label: moment(newTime).format('MM/DD HH'), value: newTime }], "value");
    this.apptFrom.reset();
  }

  /**
   * 新增用戶
   */
  onAddUser() {
    if (!this.valid(this.userForm)) {
      return;
    }

    const { userName, userTime } = this.userForm.value;
    if (this.users.has(userName!)) {
      alert("已有相同用戶");
      return;
    }

    this.users.add(userName!);
    for (const time of userTime!) {
      const rowIndex = _.findIndex(this.rowData, (row) => moment(row.apptTime).isSame(time));
      this.rowData[rowIndex].users = [...this.rowData[rowIndex].users, userName!];
    }
    this.rowData = [...this.rowData];
    this.userForm.reset();
    this.optimizeAppt();
  }

  /**
   * 優化預約
   */
  optimizeAppt() {
    this.rowData2 = [];
    // 創建一個圖來表示用戶和他們可用的時間
    const graph: Map<string, Date[]> = new Map();
    const matches = new Map<string, Date | null>();
    const used = new Set<Date>();

    // 對每個用戶找出他們所有可用的預約時間
    for (const user of this.users) {
        graph.set(user, this.rowData
            .filter(data => data.users.includes(user))
            .map(data => data.apptTime)
        );
    }

    // 使用匈牙利算法為每個用戶找到最佳匹配
    for (const [user, times] of graph) {
        this.findMatch(user, times, used, new Set(), matches);
    }

    // 將匹配結果轉換為所需的輸出格式
    for (const [user, time] of matches) {
      if (time) {
        this.rowData2 = _.sortBy([...this.rowData2, ({ apptTime: time, users: [user] })], "appTime");
      }
      else {
        this.unMatchUsers.add(user);
      }
    }
  }

  /**
   * 遞迴方法，用於在圖中找到增廣路徑
   * @param user - 當前用戶
   * @param times - 使用者可預約時段
   * @param used - 已使用的預約時段
   * @param visited - 已訪問的用戶
   * @param matches - 當前匹配結果
   * @returns 是否找到匹配
   */
  private findMatch(
    user: string,
    times: Date[],
    used : Set<Date>,
    visited : Set<string>,
    matches: Map<string, Date | null>
  ): boolean {
    if (visited.has(user)) return false;
    visited.add(user);

    for (const time of times) {
      if (!used.has(time) || this.findMatch(user, times, used, visited, matches)) {
        matches.set(user, time);
        used.add(time);
        return true;
      }
    }

    matches.set(user, null);
    return false;
  }

  /**
   * 驗證表單是否有效
   */
  private valid(from: FormGroup) {
    if (!from.valid) {
      Object.values(from.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return false;
    }
    return true;
  }
}

interface OptimizationResult {
  matchedAppointments: ApptData[];
  unmatchedUsers: string[];
}
