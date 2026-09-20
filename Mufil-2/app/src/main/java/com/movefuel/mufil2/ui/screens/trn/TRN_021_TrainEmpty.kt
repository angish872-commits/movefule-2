package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN021TrainEmptyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_021",
        title = "Train Empty",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_022,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_020,
        onNavigate = onNavigate,
    ) {
            MFNotice("Train Empty","Train explicitly distinguishes empty, unknown, offline, stale, and loading states.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN021TrainEmptyScreenPreview() {
    MoveFuelTheme { TRN021TrainEmptyScreen {} }
}
