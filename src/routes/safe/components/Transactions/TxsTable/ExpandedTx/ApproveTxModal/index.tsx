import Checkbox from '@material-ui/core/Checkbox'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import IconButton from '@material-ui/core/IconButton'
import { withStyles } from '@material-ui/core/styles'
import Close from '@material-ui/icons/Close'
import { withSnackbar } from 'notistack'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { styles } from './style'

import Modal from 'src/components/Modal'
import Block from 'src/components/layout/Block'
import Bold from 'src/components/layout/Bold'
import Button from 'src/components/layout/Button'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { TX_NOTIFICATION_TYPES } from 'src/logic/safe/transactions'
import { estimateTxGasCosts } from 'src/logic/safe/transactions/gasNew'
import { formatAmount } from 'src/logic/tokens/utils/formatAmount'
import { getWeb3 } from 'src/logic/wallets/getWeb3'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import processTransaction from 'src/routes/safe/store/actions/processTransaction'

import { safeParamAddressFromStateSelector, safeThresholdSelector } from 'src/routes/safe/store/selectors'

export const APPROVE_TX_MODAL_SUBMIT_BTN_TEST_ID = 'approve-tx-modal-submit-btn'
export const REJECT_TX_MODAL_SUBMIT_BTN_TEST_ID = 'reject-tx-modal-submit-btn'

const getModalTitleAndDescription = (thresholdReached, isCancelTx) => {
  const modalInfo = {
    title: 'Execute Transaction Rejection',
    description: 'This action will execute this transaction.',
  }

  if (isCancelTx) {
    return modalInfo
  }

  if (thresholdReached) {
    modalInfo.title = 'Execute Transaction'
    modalInfo.description =
      'This action will execute this transaction. A separate Transaction will be performed to submit the execution.'
  } else {
    modalInfo.title = 'Approve Transaction'
    modalInfo.description =
      'This action will approve this transaction. A separate Transaction will be performed to submit the approval.'
  }

  return modalInfo
}

const ApproveTxModal = ({
  canExecute,
  classes,
  closeSnackbar,
  enqueueSnackbar,
  isCancelTx,
  isOpen,
  onClose,
  thresholdReached,
  tx,
}: any) => {
  const dispatch = useDispatch()
  const userAddress = useSelector(userAccountSelector)
  const threshold = useSelector(safeThresholdSelector)
  const safeAddress = useSelector(safeParamAddressFromStateSelector)
  const [approveAndExecute, setApproveAndExecute] = useState(canExecute)
  const [gasCosts, setGasCosts] = useState('< 0.001')
  const { description, title } = getModalTitleAndDescription(thresholdReached, isCancelTx)
  const oneConfirmationLeft = !thresholdReached && tx.confirmations.size + 1 === threshold
  const isTheTxReadyToBeExecuted = oneConfirmationLeft ? true : thresholdReached

  useEffect(() => {
    let isCurrent = true

    const estimateGas = async () => {
      const web3 = getWeb3()
      const { fromWei, toBN } = web3.utils

      const estimatedGasCosts = await estimateTxGasCosts(
        safeAddress,
        tx.recipient,
        tx.data,
        tx,
        approveAndExecute ? userAddress : undefined,
      )
      const gasCostsAsEth = fromWei(toBN(estimatedGasCosts), 'ether')
      const formattedGasCosts = formatAmount(gasCostsAsEth)
      if (isCurrent) {
        setGasCosts(formattedGasCosts)
      }
    }

    estimateGas()

    return () => {
      isCurrent = false
    }
  }, [approveAndExecute, safeAddress, tx, userAddress])

  const handleExecuteCheckbox = () => setApproveAndExecute((prevApproveAndExecute) => !prevApproveAndExecute)

  const approveTx = () => {
    dispatch(
      processTransaction({
        safeAddress,
        tx,
        userAddress,
        notifiedTransaction: TX_NOTIFICATION_TYPES.CONFIRMATION_TX,
        enqueueSnackbar,
        closeSnackbar,
        approveAndExecute: canExecute && approveAndExecute && isTheTxReadyToBeExecuted,
      }),
    )
    onClose()
  }

  return (
    <Modal description={description} handleClose={onClose} open={isOpen} title={title}>
      <Row align="center" className={classes.heading} grow>
        <Paragraph className={classes.headingText} noMargin weight="bolder">
          {title}
        </Paragraph>
        <IconButton disableRipple onClick={onClose}>
          <Close className={classes.closeIcon} />
        </IconButton>
      </Row>
      <Hairline />
      <Block className={classes.container}>
        <Row style={{ flexDirection: 'column' }}>
          <Paragraph>{description}</Paragraph>
          <Paragraph color="medium" size="sm">
            Transaction nonce:
            <br />
            <Bold className={classes.nonceNumber}>{tx.nonce}</Bold>
          </Paragraph>
          {oneConfirmationLeft && canExecute && (
            <>
              <Paragraph color="error">
                Approving this transaction executes it right away.
                {!isCancelTx &&
                  ' If you want approve but execute the transaction manually later, click on the checkbox below.'}
              </Paragraph>
              {!isCancelTx && (
                <FormControlLabel
                  control={<Checkbox checked={approveAndExecute} color="primary" onChange={handleExecuteCheckbox} />}
                  label="Execute transaction"
                />
              )}
            </>
          )}
        </Row>
        <Row>
          <Paragraph>
            {`You're about to ${
              approveAndExecute ? 'execute' : 'approve'
            } a transaction and will have to confirm it with your currently connected wallet. Make sure you have ${gasCosts} (fee price) ETH in this wallet to fund this confirmation.`}
          </Paragraph>
        </Row>
      </Block>
      <Row align="center" className={classes.buttonRow}>
        <Button minHeight={42} minWidth={140} onClick={onClose}>
          Exit
        </Button>
        <Button
          color={isCancelTx ? 'secondary' : 'primary'}
          minHeight={42}
          minWidth={214}
          onClick={approveTx}
          testId={isCancelTx ? REJECT_TX_MODAL_SUBMIT_BTN_TEST_ID : APPROVE_TX_MODAL_SUBMIT_BTN_TEST_ID}
          type="submit"
          variant="contained"
        >
          {title}
        </Button>
      </Row>
    </Modal>
  )
}

export default withStyles(styles as any)(withSnackbar(ApproveTxModal))
