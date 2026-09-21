package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN010WeeklyPlanScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_010",
        title = "Weekly Plan",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("Weekly plan unavailable", "Planned sessions are shown only from a canonical plan source.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN010WeeklyPlanScreenPreview() {
    MoveFuelTheme { TRN010WeeklyPlanScreen {} }
}
