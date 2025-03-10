import * as React from 'react'

import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { Branch } from '../../models/branch'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Ref } from '../lib/ref'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { IAheadBehind } from '../../models/branch'
import { MergeTreeResult } from '../../models/merge'

interface IDeleteBranchProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly branch: Branch
  readonly mergeStatus: MergeTreeResult | null
  readonly existsOnRemote: boolean
  readonly aheadBehind: IAheadBehind | null
  readonly onDismissed: () => void
  readonly onDeleted: (repository: Repository) => void
}

interface IDeleteBranchState {
  readonly includeRemoteBranch: boolean
  readonly isDeleting: boolean
}

export class DeleteBranch extends React.Component<
  IDeleteBranchProps,
  IDeleteBranchState
> {
  public constructor(props: IDeleteBranchProps) {
    super(props)

    this.state = {
      includeRemoteBranch: false,
      isDeleting: false,
    }
  }

  public render() {
    const aheadBehind = this.props.aheadBehind
    return aheadBehind !== null && aheadBehind.ahead > 0
      ? this.renderDeleteBranchWithUnmergedCommits()
      : this.renderDeleteBranch()
  }

  private renderDeleteBranchWithUnmergedCommits() {
    const unmergedCommits = this.props.aheadBehind!.ahead

    return (
      <Dialog
        id="delete-branch"
        title={__DARWIN__ ? 'Delete Branch' : 'Delete branch'}
        type="warning"
        onSubmit={this.mergeAndDeleteBranch}
        onDismissed={this.renderDeleteBranch}
      >
        <DialogContent>
          <p>
            <Ref>{this.props.branch.name}</Ref> has <em>{unmergedCommits}</em>{' '}
            unmerged {unmergedCommits === 1 ? 'commit' : 'commits'}.
            <br />
            Would you like to merge your changes first?
          </p>
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            destructive={true}
            cancelButtonText="No"
            okButtonText="Merge and Delete"
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private renderDeleteBranch() {
    return (
      <Dialog
        id="delete-branch"
        title={__DARWIN__ ? 'Delete Branch' : 'Delete branch'}
        type="warning"
        onSubmit={this.deleteBranch}
        onDismissed={this.props.onDismissed}
        disabled={this.state.isDeleting}
        loading={this.state.isDeleting}
      >
        <DialogContent>
          <p>
            Delete branch <Ref>{this.props.branch.name}</Ref>?<br />
            This action cannot be undone.
          </p>

          {this.renderDeleteOnRemote()}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup destructive={true} okButtonText="Delete" />
        </DialogFooter>
      </Dialog>
    )
  }

  private renderDeleteOnRemote() {
    const unmergedCommits = this.props.aheadBehind!.ahead

    if (this.props.branch.upstreamRemoteName && this.props.existsOnRemote) {
      return (
        <div>
          <p>
            <strong>
              The branch also exists on the remote, do you wish to delete it
              there as well?
            </strong>
          </p>
          {this.props.aheadBehind && this.props.aheadBehind.ahead > 0 ? (
            <p>
              <Ref>{this.props.branch.name}</Ref> has <em>{unmergedCommits}</em>{' '}
              unmerged {unmergedCommits === 1 ? 'commit' : 'commits'}.
            </p>
          ) : null}
          <Checkbox
            label="Yes, delete this branch on the remote"
            value={
              this.state.includeRemoteBranch
                ? CheckboxValue.On
                : CheckboxValue.Off
            }
            onChange={this.onIncludeRemoteChanged}
          />
        </div>
      )
    }

    return null
  }

  private onIncludeRemoteChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const value = event.currentTarget.checked

    this.setState({ includeRemoteBranch: value })
  }

  private deleteBranch = async () => {
    const { dispatcher, repository, branch } = this.props

    this.setState({ isDeleting: true })

    await dispatcher.deleteLocalBranch(
      repository,
      branch,
      this.state.includeRemoteBranch
    )
    this.props.onDeleted(repository)

    this.props.onDismissed()
  }

  private mergeAndDeleteBranch = async () => {
    await this.props.dispatcher.mergeBranch(
      this.props.repository,
      this.props.branch,
      this.props.mergeStatus
    )

    this.renderDeleteBranch()
  }
}
