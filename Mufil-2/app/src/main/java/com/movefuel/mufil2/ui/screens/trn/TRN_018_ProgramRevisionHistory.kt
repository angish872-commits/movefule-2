package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN018ProgramRevisionHistoryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_018",
        title = "Program Revision History",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_017,
        onNavigate = onNavigate,
    ) {
            MFListItem("Training days","Mon · Wed · Sat","Edit")
            MFListItem("Session length","45 min","Edit")
            MFListItem("Equipment","Full gym","Edit")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN018ProgramRevisionHistoryScreenPreview() {
    MoveFuelTheme { TRN018ProgramRevisionHistoryScreen {} }
}
