package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN011WeeklyDayDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_011",
        title = "Weekly Day Detail",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_010,
        onNavigate = onNavigate,
    ) {
            MFNotice("Day detail unavailable", "Planned exercise details are unavailable without a canonical plan.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN011WeeklyDayDetailScreenPreview() {
    MoveFuelTheme { TRN011WeeklyDayDetailScreen {} }
}
